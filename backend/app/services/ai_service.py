"""Logique métier — conversations AI."""
from __future__ import annotations

from dataclasses import dataclass

from app.core import config
from app.domain.ai_provider import (
    AiProviderName,
    ai_provider_for,
    is_google_translate_configured,
    is_provider_configured,
    is_tts_ai_configured,
    is_voice_ai_configured,
    normalize_ai_provider_name,
)
from app.services.ai.ai_client import AiError, generate_chat, generate_text, resolve_provider


@dataclass
class AiChatMessage:
    role: str
    content: str


@dataclass
class AiChatResult:
    reply: str
    provider: AiProviderName


@dataclass
class AiProviderInfo:
    id: AiProviderName
    label: str
    configured: bool
    model: str
    is_default: bool


def _to_gemini_contents(messages: list[AiChatMessage]) -> list[dict]:
    contents: list[dict] = []
    for message in messages:
        role = "model" if message.role == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": message.content}]})
    return contents


def _validate_messages(messages: list[AiChatMessage]) -> None:
    if not messages:
        raise ValueError("נדרשת לפחות הודעה אחת")
    if not any(m.role == "user" and m.content.strip() for m in messages):
        raise ValueError("נדרשת הודעת משתמש")
    if len(messages) > 40:
        raise ValueError("יותר מדי הודעות בשיחה")


def _ensure_provider_available(provider: AiProviderName) -> None:
    if not is_provider_configured(provider):
        raise ValueError(f"ספק AI '{provider}' אינו מוגדר")


class AiService:
    def list_providers(self) -> list[AiProviderInfo]:
        default = ai_provider_for()
        labels = {"gemini": "Gemini", "opencode": "OpenCode Go"}
        models = {"gemini": config.GEMINI_MODEL, "opencode": config.OPENCODE_MODEL_ID}
        result: list[AiProviderInfo] = []
        for provider_id in ("gemini", "opencode"):
            provider = normalize_ai_provider_name(provider_id)
            result.append(
                AiProviderInfo(
                    id=provider,
                    label=labels[provider],
                    configured=is_provider_configured(provider),
                    model=models[provider],
                    is_default=default == provider,
                )
            )
        return result

    def status(self) -> dict:
        providers = self.list_providers()
        return {
            "available": [p.id for p in providers if p.configured],
            "default": ai_provider_for(),
            "voice_available": is_voice_ai_configured(),
            "tts_available": is_tts_ai_configured(),
            "translate_available": is_google_translate_configured(),
            "tts_provider": "google" if is_tts_ai_configured() else None,
            "providers": [
                {
                    "id": p.id,
                    "label": p.label,
                    "configured": p.configured,
                    "model": p.model,
                    "is_default": p.is_default,
                }
                for p in providers
            ],
        }

    async def chat(
        self,
        messages: list[AiChatMessage],
        *,
        provider: str | None = None,
        system: str | None = None,
        for_generation: bool = False,
    ) -> AiChatResult:
        _validate_messages(messages)
        resolved = resolve_provider(provider=provider)
        _ensure_provider_available(resolved)

        contents = _to_gemini_contents(messages)
        try:
            if len(messages) == 1 and messages[0].role == "user":
                reply = await generate_text(
                    messages[0].content.strip(),
                    system=system,
                    for_generation=for_generation,
                    provider=provider,
                )
            else:
                reply = await generate_chat(
                    contents,
                    system=system,
                    for_generation=for_generation,
                    provider=provider,
                )
        except AiError as exc:
            raise ValueError(str(exc)) from exc

        return AiChatResult(reply=reply, provider=resolved)

    async def complete(
        self,
        prompt: str,
        *,
        provider: str | None = None,
        system: str | None = None,
        for_generation: bool = False,
    ) -> AiChatResult:
        text = (prompt or "").strip()
        if not text:
            raise ValueError("נדרש טקסט")
        resolved = resolve_provider(provider=provider)
        _ensure_provider_available(resolved)
        try:
            reply = await generate_text(
                text,
                system=system,
                for_generation=for_generation,
                provider=provider,
            )
        except AiError as exc:
            raise ValueError(str(exc)) from exc
        return AiChatResult(reply=reply, provider=resolved)
