"""Routage fournisseur AI (Gemini / OpenCode Go)."""
from __future__ import annotations

from typing import Literal

from app.core import config

AiProviderName = Literal["gemini", "opencode"]


def normalize_ai_provider_name(
    raw: str | None,
    default: AiProviderName = "gemini",
) -> AiProviderName:
    text = (raw or "").strip().lower()
    if not text:
        return default
    if text in ("gemini", "google"):
        return "gemini"
    if text in ("opencode", "opencode-go", "opencode_go"):
        return "opencode"
    return default


def ai_provider_for() -> AiProviderName:
    """Fournisseur AI par défaut (AI_PROVIDER)."""
    return normalize_ai_provider_name(config.AI_PROVIDER)


def is_provider_configured(provider: AiProviderName) -> bool:
    if provider == "gemini":
        return bool(config.GEMINI_API_KEY)
    if config.OPENCODE_API_KEY:
        return True
    return bool(config.OPENCODE_SERVER_URL)


def available_providers() -> list[AiProviderName]:
    providers: list[AiProviderName] = []
    if is_provider_configured("gemini"):
        providers.append("gemini")
    if is_provider_configured("opencode"):
        providers.append("opencode")
    return providers
