"""Point d'entrée unique pour les appels AI (Gemini ou OpenCode Go)."""
from __future__ import annotations

import logging
import time
from typing import Literal

from app.core import config
from app.domain.ai_provider import AiProviderName, ai_provider_for, normalize_ai_provider_name

logger = logging.getLogger(__name__)

AiProvider = Literal["gemini", "opencode"]


class AiError(Exception):
    """Erreur fournisseur AI (Gemini ou OpenCode)."""


def resolve_provider(*, provider: str | None = None) -> AiProviderName:
    if provider and provider.strip():
        return normalize_ai_provider_name(provider)
    return ai_provider_for()


def uses_gemini(*, provider: str | None = None) -> bool:
    return resolve_provider(provider=provider) == "gemini"


def _audience(for_generation: bool) -> str:
    return "generation" if for_generation else "chat"


def _gemini_timeouts(*, for_generation: bool, timeout_seconds: float | None) -> float:
    if timeout_seconds is not None:
        return timeout_seconds
    if for_generation:
        return config.GEMINI_GENERATION_TIMEOUT_SECONDS
    return config.GEMINI_TIMEOUT_SECONDS


def _gemini_max_tokens(for_generation: bool) -> int | None:
    if for_generation:
        return config.GEMINI_GENERATION_MAX_OUTPUT_TOKENS
    return None


def _generation_system(*, provider: str | None, for_generation: bool) -> str:
    if uses_gemini(provider=provider):
        return (
            "You assist supermarket operations staff. "
            "Reply as the Assistant only. Text only."
        )
    from app.services.ai.opencode_errors import generation_system

    return generation_system()


def _describe_ai_call(
    *,
    provider: str | None,
    for_generation: bool,
) -> tuple[str, str, str, str]:
    audience = _audience(for_generation)
    resolved = resolve_provider(provider=provider)
    if resolved == "gemini":
        model = config.GEMINI_MODEL or "gemini-2.0-flash"
        transport = "gemini-api"
    else:
        model = config.OPENCODE_MODEL_ID
        transport = "opencode-cloud" if config.OPENCODE_API_KEY else "opencode-local"
    return audience, resolved, model, transport


def _log_ai_call_start(*, mode: str, provider: str | None, for_generation: bool) -> None:
    audience, resolved, model, transport = _describe_ai_call(
        provider=provider,
        for_generation=for_generation,
    )
    logger.info(
        "AI call start | role=%s | provider=%s | model=%s | transport=%s | mode=%s",
        audience,
        resolved,
        model,
        transport,
        mode,
    )


def _log_ai_call_done(
    *,
    mode: str,
    provider: str | None,
    for_generation: bool,
    started: float,
    ok: bool,
    output_chars: int = 0,
) -> None:
    audience, resolved, model, transport = _describe_ai_call(
        provider=provider,
        for_generation=for_generation,
    )
    elapsed_ms = int((time.monotonic() - started) * 1000)
    status = "ok" if ok else "error"
    logger.info(
        "AI call %s | role=%s | provider=%s | model=%s | transport=%s | mode=%s | %sms | chars=%s",
        status,
        audience,
        resolved,
        model,
        transport,
        mode,
        elapsed_ms,
        output_chars,
    )


async def _generate_text_gemini(
    prompt: str,
    *,
    system: str | None,
    timeout_seconds: float | None,
    provider: str | None,
    for_generation: bool,
) -> str:
    from app.services.ai.gemini_client import GeminiError, generate_text as gemini_text

    try:
        return await gemini_text(
            prompt,
            max_output_tokens=_gemini_max_tokens(for_generation),
            timeout_seconds=_gemini_timeouts(
                for_generation=for_generation,
                timeout_seconds=timeout_seconds,
            ),
            use_generation_fallbacks=for_generation,
            system_instruction=system
            or (_generation_system(provider=provider, for_generation=for_generation) if for_generation else None),
        )
    except GeminiError as exc:
        raise AiError(str(exc)) from exc


async def _generate_text_opencode(
    prompt: str,
    *,
    system: str | None,
    timeout_seconds: float | None,
    for_generation: bool,
) -> str:
    from app.services.ai.opencode_client import OpenCodeError, generate_text as opencode_text

    try:
        return await opencode_text(
            prompt,
            system=system,
            timeout_seconds=timeout_seconds,
            for_generation=for_generation,
        )
    except OpenCodeError as exc:
        raise AiError(str(exc)) from exc


async def _generate_chat_gemini(
    contents: list[dict],
    *,
    system: str | None,
    timeout_seconds: float | None,
    provider: str | None,
    for_generation: bool,
) -> str:
    from app.services.ai.gemini_client import GeminiError, generate_chat as gemini_chat

    try:
        return await gemini_chat(
            contents,
            max_output_tokens=_gemini_max_tokens(for_generation),
            timeout_seconds=_gemini_timeouts(
                for_generation=for_generation,
                timeout_seconds=timeout_seconds,
            ),
            use_generation_fallbacks=for_generation,
            system_instruction=system
            or (_generation_system(provider=provider, for_generation=for_generation) if for_generation else None),
        )
    except GeminiError as exc:
        raise AiError(str(exc)) from exc


async def _generate_chat_opencode(
    contents: list[dict],
    *,
    system: str | None,
    timeout_seconds: float | None,
    for_generation: bool,
) -> str:
    from app.services.ai.opencode_client import OpenCodeError, generate_chat as opencode_chat

    try:
        return await opencode_chat(
            contents,
            system=system,
            timeout_seconds=timeout_seconds,
            for_generation=for_generation,
        )
    except OpenCodeError as exc:
        raise AiError(str(exc)) from exc


async def generate_text(
    prompt: str,
    *,
    system: str | None = None,
    timeout_seconds: float | None = None,
    for_generation: bool = False,
    provider: str | None = None,
) -> str:
    started = time.monotonic()
    _log_ai_call_start(mode="text", provider=provider, for_generation=for_generation)
    try:
        if uses_gemini(provider=provider):
            text = await _generate_text_gemini(
                prompt,
                system=system,
                timeout_seconds=timeout_seconds,
                provider=provider,
                for_generation=for_generation,
            )
        else:
            text = await _generate_text_opencode(
                prompt,
                system=system,
                timeout_seconds=timeout_seconds,
                for_generation=for_generation,
            )
    except AiError:
        _log_ai_call_done(
            mode="text",
            provider=provider,
            for_generation=for_generation,
            started=started,
            ok=False,
        )
        raise
    _log_ai_call_done(
        mode="text",
        provider=provider,
        for_generation=for_generation,
        started=started,
        ok=True,
        output_chars=len(text),
    )
    return text


async def generate_chat(
    contents: list[dict],
    *,
    system: str | None = None,
    timeout_seconds: float | None = None,
    for_generation: bool = False,
    provider: str | None = None,
) -> str:
    started = time.monotonic()
    _log_ai_call_start(mode="chat", provider=provider, for_generation=for_generation)
    try:
        if uses_gemini(provider=provider):
            text = await _generate_chat_gemini(
                contents,
                system=system,
                timeout_seconds=timeout_seconds,
                provider=provider,
                for_generation=for_generation,
            )
        else:
            text = await _generate_chat_opencode(
                contents,
                system=system,
                timeout_seconds=timeout_seconds,
                for_generation=for_generation,
            )
    except AiError:
        _log_ai_call_done(
            mode="chat",
            provider=provider,
            for_generation=for_generation,
            started=started,
            ok=False,
        )
        raise
    _log_ai_call_done(
        mode="chat",
        provider=provider,
        for_generation=for_generation,
        started=started,
        ok=True,
        output_chars=len(text),
    )
    return text
