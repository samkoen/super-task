"""Client OpenCode Go — serveur local ou cloud."""
from __future__ import annotations

import asyncio
import logging
import time

import httpx

from app.core import config
from app.services.ai.opencode_cloud_client import generate_chat_cloud, generate_text_cloud
from app.services.ai.opencode_errors import OpenCodeError, generation_system, run_profile

logger = logging.getLogger(__name__)

_TRANSIENT_STATUSES = frozenset({429, 502, 503, 504})
_DISABLED_TOOLS = {
    "write": False,
    "edit": False,
    "bash": False,
    "glob": False,
    "grep": False,
    "read": False,
    "list": False,
    "webfetch": False,
    "websearch": False,
    "task": False,
}


def _uses_cloud_api() -> bool:
    return bool(config.OPENCODE_API_KEY)


def _raise_missing_config() -> None:
    if config.IS_VERCEL:
        hint = "הגדר OPENCODE_API_KEY ב-Vercel → Environment Variables."
    else:
        hint = (
            "הגדר OPENCODE_API_KEY (ענן) או OPENCODE_SERVER_URL + opencode serve (מקומי) "
            "ב-backend/.env."
        )
    raise OpenCodeError(f"שירות AI אינו מוגדר. {hint}")


def _server_url() -> str:
    return config.OPENCODE_SERVER_URL.rstrip("/")


def _auth() -> httpx.BasicAuth | None:
    password = config.OPENCODE_SERVER_PASSWORD
    if not password:
        return None
    username = config.OPENCODE_SERVER_USERNAME or "opencode"
    return httpx.BasicAuth(username, password)


def _extract_text(payload: dict) -> str:
    info = payload.get("info")
    if isinstance(info, dict):
        _raise_if_message_error(info)
    parts = payload.get("parts") or []
    texts = [
        part["text"]
        for part in parts
        if part.get("type") == "text"
        and isinstance(part.get("text"), str)
        and part["text"].strip()
    ]
    if not texts:
        raise OpenCodeError("תשובה ריקה מהמודל")
    return "\n".join(texts).strip()


def _raise_if_message_error(info: dict) -> None:
    error = info.get("error")
    if not isinstance(error, dict):
        return
    data = error.get("data") if isinstance(error.get("data"), dict) else {}
    message = str(data.get("message") or error.get("name") or "שגיאת API")
    lowered = message.lower()
    if "credits" in lowered or "licenses" in lowered or "permission-denied" in lowered:
        raise OpenCodeError("אין קרדיטים ב-OpenCode Go — בדקו מנוי ומגבלות ב-opencode.ai/go.")
    if "invalid api key" in lowered or "unauthorized" in lowered:
        raise OpenCodeError("מפתח OpenCode Go לא תקין — חברו מחדש ב-/connect → OpenCode Go.")
    status = data.get("statusCode")
    if status == 429:
        raise OpenCodeError("מכסת OpenCode Go נגמרה — נסו שוב מאוחר יותר.")
    raise OpenCodeError(message[:300])


def _parse_api_error(response: httpx.Response) -> tuple[str, list[str]]:
    try:
        payload = response.json()
        if isinstance(payload, dict):
            err = payload.get("error") or payload.get("data") or payload
            if isinstance(err, dict):
                suggestions = err.get("suggestions") or []
                if isinstance(suggestions, list):
                    hint = ", ".join(str(s) for s in suggestions[:3])
                else:
                    hint = ""
                message = str(err.get("message") or err.get("_tag") or err)
                if hint:
                    message = f"{message} — הצעות: {hint}"
                return message, [str(s) for s in suggestions] if isinstance(suggestions, list) else []
            return str(err), []
    except Exception:
        pass
    return response.text[:300], []


def _user_message(status: int, detail: str, suggestions: list[str]) -> str:
    detail_lower = detail.lower()
    if "providermodelnotfound" in detail_lower or "model not found" in detail_lower:
        model = config.OPENCODE_MODEL_ID
        hint = suggestions[0] if suggestions else "deepseek-v4-flash"
        return f"המודל '{model}' לא זמין ב-OpenCode Go — עדכן OPENCODE_MODEL_ID (למשל {hint})."
    if status in (401, 403):
        return "אימות שרת OpenCode נכשל — בדקו OPENCODE_SERVER_PASSWORD."
    if status == 404:
        return "שרת OpenCode לא נמצא — ודאו ש-opencode serve פועל."
    if status == 429 or "rate limit" in detail_lower:
        return "מכסת OpenCode Go נגמרה — נסו שוב מאוחר יותר."
    if status in _TRANSIENT_STATUSES or "unavailable" in detail_lower:
        return "שירות OpenCode עמוס כרגע — נסו בעוד דקה."
    return "שגיאה בשירות הבינה המלאכותית"


def _contents_to_prompt(contents: list[dict]) -> str:
    blocks: list[str] = []
    for item in contents:
        role = item.get("role", "user")
        parts = item.get("parts") or []
        text = "\n".join(
            part["text"]
            for part in parts
            if isinstance(part, dict) and isinstance(part.get("text"), str) and part["text"].strip()
        ).strip()
        if not text:
            continue
        speaker = "Assistant" if role == "model" else "User"
        blocks.append(f"{speaker}:\n{text}")
    blocks.append("Assistant:")
    return "\n\n".join(blocks)


def _message_body(
    prompt: str,
    system: str | None,
    *,
    model_id: str,
    agent: str,
) -> dict:
    return {
        "model": {"providerID": config.OPENCODE_PROVIDER_ID, "modelID": model_id},
        "agent": agent,
        "system": system or "Answer in the language requested in the user message. Text only, no tools.",
        "tools": _DISABLED_TOOLS,
        "parts": [{"type": "text", "text": prompt}],
    }


def _http_timeout(read_seconds: float) -> httpx.Timeout:
    return httpx.Timeout(connect=15.0, read=read_seconds, write=30.0, pool=15.0)


def _timeout_error(read_seconds: float) -> OpenCodeError:
    return OpenCodeError(
        f"הבקשה ל-AI ארכה יותר מ-{int(read_seconds)} שניות — "
        "נסו שוב או הגדירו OPENCODE_TIMEOUT_SECONDS.",
        retryable=False,
    )


def _connect_error() -> OpenCodeError:
    url = _server_url() or "127.0.0.1:4096"
    return OpenCodeError(
        f"שרת OpenCode לא זמין ({url}) — הפעילו opencode serve ובדקו OPENCODE_SERVER_URL.",
        retryable=False,
    )


async def _request(
    method: str,
    path: str,
    *,
    json_body: dict | None = None,
    timeout: float,
) -> httpx.Response:
    url = f"{_server_url()}{path}"
    try:
        async with httpx.AsyncClient(timeout=_http_timeout(timeout), auth=_auth()) as client:
            return await client.request(method, url, json=json_body)
    except httpx.ConnectError as exc:
        logger.warning("OpenCode %s %s connect failed: %s", method, path, exc)
        raise _connect_error() from exc
    except httpx.TimeoutException as exc:
        logger.warning("OpenCode %s %s timed out after %ss", method, path, int(timeout))
        raise _timeout_error(timeout) from exc


async def _create_session(timeout: float, *, session_title: str) -> str:
    response = await _request(
        "POST",
        "/session",
        json_body={"title": session_title},
        timeout=timeout,
    )
    if response.status_code >= 400:
        detail, suggestions = _parse_api_error(response)
        logger.warning("OpenCode create session %s: %s", response.status_code, detail)
        raise OpenCodeError(_user_message(response.status_code, detail, suggestions))
    session_id = (response.json() or {}).get("id")
    if not isinstance(session_id, str) or not session_id:
        raise OpenCodeError("אין מזהה סשן מ-OpenCode")
    return session_id


async def _delete_session(session_id: str, timeout: float) -> None:
    try:
        await _request("DELETE", f"/session/{session_id}", timeout=timeout)
    except Exception as exc:
        logger.debug("OpenCode session cleanup failed: %s", exc)


async def _send_message(
    session_id: str,
    prompt: str,
    timeout: float,
    *,
    system: str | None,
    model_id: str,
    agent: str,
) -> str:
    logger.info(
        "OpenCode waiting for model (session=%s, agent=%s, timeout=%ss)",
        session_id,
        agent,
        int(timeout),
    )
    started = time.monotonic()
    response = await _request(
        "POST",
        f"/session/{session_id}/message",
        json_body=_message_body(prompt, system, model_id=model_id, agent=agent),
        timeout=timeout,
    )
    if response.status_code >= 400:
        detail, suggestions = _parse_api_error(response)
        logger.warning("OpenCode message %s session=%s: %s", response.status_code, session_id, detail)
        raise OpenCodeError(_user_message(response.status_code, detail, suggestions))
    text = _extract_text(response.json())
    logger.info(
        "OpenCode model replied in %.1fs (session=%s, chars=%d)",
        time.monotonic() - started,
        session_id,
        len(text),
    )
    return text


async def _generate_once(
    prompt: str,
    timeout: float,
    *,
    system: str | None,
    model_id: str,
    agent: str,
    session_title: str,
) -> str:
    started = time.monotonic()
    session_id = await _create_session(timeout, session_title=session_title)
    try:
        text = await _send_message(
            session_id,
            prompt,
            timeout,
            system=system,
            model_id=model_id,
            agent=agent,
        )
        logger.info(
            "OpenCode generation done in %.1fs (agent=%s, model=%s, chars=%d)",
            time.monotonic() - started,
            agent,
            model_id,
            len(text),
        )
        return text
    finally:
        await _delete_session(session_id, timeout)


async def _generate_with_profile(
    prompt: str,
    *,
    system: str | None,
    timeout_seconds: float | None,
    for_generation: bool,
) -> str:
    profile = run_profile(for_generation=for_generation)
    timeout = timeout_seconds or float(profile["timeout"])
    resolved_system = system or (generation_system() if for_generation else None)
    retries = max(0, config.OPENCODE_RETRY_COUNT)
    delay = config.OPENCODE_RETRY_DELAY_SECONDS
    last: OpenCodeError | None = None
    for attempt in range(retries + 1):
        try:
            return await _generate_once(
                prompt,
                timeout,
                system=resolved_system,
                model_id=str(profile["model_id"]),
                agent=str(profile["agent"]),
                session_title=str(profile["session_title"]),
            )
        except OpenCodeError as exc:
            last = exc
            if not exc.retryable:
                logger.warning("OpenCode error (no retry): %s", exc)
                break
            if attempt >= retries:
                break
            logger.info("OpenCode retry %s/%s after error: %s", attempt + 1, retries, exc)
            await asyncio.sleep(delay * (attempt + 1))
    assert last is not None
    raise last


async def generate_text(
    prompt: str,
    *,
    system: str | None = None,
    timeout_seconds: float | None = None,
    for_generation: bool = False,
) -> str:
    if _uses_cloud_api():
        return await generate_text_cloud(
            prompt,
            system=system,
            timeout_seconds=timeout_seconds,
            for_generation=for_generation,
        )
    if not config.OPENCODE_SERVER_URL:
        _raise_missing_config()
    return await _generate_with_profile(
        prompt,
        system=system,
        timeout_seconds=timeout_seconds,
        for_generation=for_generation,
    )


async def generate_chat(
    contents: list[dict],
    *,
    system: str | None = None,
    timeout_seconds: float | None = None,
    for_generation: bool = False,
) -> str:
    if _uses_cloud_api():
        return await generate_chat_cloud(
            contents,
            system=system,
            timeout_seconds=timeout_seconds,
            for_generation=for_generation,
        )
    prompt = _contents_to_prompt(contents)
    return await generate_text(
        prompt,
        system=system,
        timeout_seconds=timeout_seconds,
        for_generation=for_generation,
    )
