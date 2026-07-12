"""Client OpenCode Go via API cloud (compatible OpenAI)."""
from __future__ import annotations

import asyncio
import logging
import time

from openai import APIConnectionError, APITimeoutError, AsyncOpenAI, OpenAIError, RateLimitError

from app.core import config
from app.services.ai.opencode_errors import OpenCodeError, generation_system, run_profile

logger = logging.getLogger(__name__)


def _part_text(parts: list) -> str:
    return "\n".join(
        part["text"]
        for part in parts
        if isinstance(part, dict) and isinstance(part.get("text"), str) and part["text"].strip()
    ).strip()


def _messages_from_contents(contents: list[dict], system: str | None) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    for item in contents:
        role = "assistant" if item.get("role") == "model" else "user"
        text = _part_text(item.get("parts") or [])
        if text:
            messages.append({"role": role, "content": text})
    return messages


def _messages_for_prompt(prompt: str, system: str | None) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    return messages


def _map_openai_error(exc: OpenAIError) -> OpenCodeError:
    msg = str(exc).lower()
    if isinstance(exc, RateLimitError) or "rate limit" in msg or "429" in msg:
        return OpenCodeError("מכסת OpenCode Go נגמרה — נסו שוב מאוחר יותר.", retryable=True)
    if isinstance(exc, APITimeoutError):
        return OpenCodeError(
            f"הבקשה ל-AI ארכה יותר מ-{int(config.OPENCODE_TIMEOUT_SECONDS)} שניות.",
            retryable=False,
        )
    if isinstance(exc, APIConnectionError):
        return OpenCodeError("לא ניתן להתחבר ל-OpenCode — בדקו OPENCODE_API_BASE_URL.", retryable=False)
    if "invalid api key" in msg or "unauthorized" in msg or "401" in msg:
        return OpenCodeError("מפתח OPENCODE_API_KEY לא תקין.", retryable=False)
    if "credits" in msg or "quota" in msg:
        return OpenCodeError("אין קרדיטים ב-OpenCode Go — בדקו מנוי ב-opencode.ai/go.", retryable=False)
    return OpenCodeError(f"שגיאה בשירות OpenCode: {str(exc)[:200]}")


def _client(timeout: float) -> AsyncOpenAI:
    return AsyncOpenAI(
        api_key=config.OPENCODE_API_KEY,
        base_url=config.OPENCODE_API_BASE_URL.rstrip("/"),
        timeout=timeout,
    )


async def _complete_once(
    messages: list[dict[str, str]],
    *,
    model_id: str,
    timeout: float,
) -> str:
    started = time.monotonic()
    logger.info("OpenCode cloud request (model=%s, timeout=%ss)", model_id, int(timeout))
    try:
        response = await _client(timeout).chat.completions.create(
            model=model_id,
            messages=messages,
        )
    except OpenAIError as exc:
        logger.warning("OpenCode cloud error: %s", exc)
        raise _map_openai_error(exc) from exc
    if isinstance(response, str):
        detail = response.strip() or "réponse invalide"
        raise OpenCodeError(f"OpenCode Go a renvoyé une erreur: {detail[:200]}", retryable=False)
    content = (response.choices[0].message.content or "").strip()
    if not content:
        raise OpenCodeError("תשובה ריקה מהמודל")
    logger.info(
        "OpenCode cloud replied in %.1fs (model=%s, chars=%d)",
        time.monotonic() - started,
        model_id,
        len(content),
    )
    return content


async def _complete_with_retries(
    messages: list[dict[str, str]],
    *,
    model_id: str,
    timeout: float,
) -> str:
    retries = max(0, config.OPENCODE_RETRY_COUNT)
    delay = config.OPENCODE_RETRY_DELAY_SECONDS
    last: OpenCodeError | None = None
    for attempt in range(retries + 1):
        try:
            return await _complete_once(messages, model_id=model_id, timeout=timeout)
        except OpenCodeError as exc:
            last = exc
            if not exc.retryable or attempt >= retries:
                break
            await asyncio.sleep(delay * (attempt + 1))
    assert last is not None
    raise last


async def generate_text_cloud(
    prompt: str,
    *,
    system: str | None,
    timeout_seconds: float | None,
    for_generation: bool,
) -> str:
    profile = run_profile(for_generation=for_generation)
    timeout = timeout_seconds or float(profile["timeout"])
    resolved = system or (generation_system() if for_generation else None)
    messages = _messages_for_prompt(prompt, resolved)
    return await _complete_with_retries(
        messages,
        model_id=str(profile["model_id"]),
        timeout=timeout,
    )


async def generate_chat_cloud(
    contents: list[dict],
    *,
    system: str | None,
    timeout_seconds: float | None,
    for_generation: bool,
) -> str:
    profile = run_profile(for_generation=for_generation)
    timeout = timeout_seconds or float(profile["timeout"])
    resolved = system or (generation_system() if for_generation else None)
    messages = _messages_from_contents(contents, resolved)
    if not any(m["role"] == "user" for m in messages):
        raise OpenCodeError("אין הודעת משתמש ל-OpenCode")
    return await _complete_with_retries(
        messages,
        model_id=str(profile["model_id"]),
        timeout=timeout,
    )
