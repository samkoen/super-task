"""Tests infrastructure AI — routage fournisseurs et service."""
from __future__ import annotations

import pytest

from app.domain.ai_provider import (
    ai_provider_for,
    available_providers,
    is_provider_configured,
    normalize_ai_provider_name,
)
from app.services.ai_service import AiChatMessage, AiService


def test_normalize_ai_provider_name():
    assert normalize_ai_provider_name("gemini") == "gemini"
    assert normalize_ai_provider_name("google") == "gemini"
    assert normalize_ai_provider_name("opencode-go") == "opencode"
    assert normalize_ai_provider_name("") == "gemini"
    assert normalize_ai_provider_name("unknown", "opencode") == "opencode"


def test_ai_provider_for(monkeypatch):
    monkeypatch.setattr("app.core.config.AI_PROVIDER", "opencode")
    assert ai_provider_for() == "opencode"

    monkeypatch.setattr("app.core.config.AI_PROVIDER", "gemini")
    assert ai_provider_for() == "gemini"


def test_is_provider_configured(monkeypatch):
    monkeypatch.setattr("app.core.config.GEMINI_API_KEY", "")
    monkeypatch.setattr("app.core.config.OPENCODE_API_KEY", "")
    monkeypatch.setattr("app.core.config.OPENCODE_SERVER_URL", "")
    assert is_provider_configured("gemini") is False
    assert is_provider_configured("opencode") is False

    monkeypatch.setattr("app.core.config.GEMINI_API_KEY", "key-123")
    assert is_provider_configured("gemini") is True

    monkeypatch.setattr("app.core.config.OPENCODE_API_KEY", "oc-key")
    assert is_provider_configured("opencode") is True


def test_available_providers(monkeypatch):
    monkeypatch.setattr("app.core.config.GEMINI_API_KEY", "g")
    monkeypatch.setattr("app.core.config.OPENCODE_API_KEY", "")
    monkeypatch.setattr("app.core.config.OPENCODE_SERVER_URL", "")
    assert available_providers() == ["gemini"]


def test_ai_service_status(monkeypatch):
    monkeypatch.setattr("app.core.config.AI_PROVIDER", "gemini")
    monkeypatch.setattr("app.core.config.GEMINI_API_KEY", "g")
    monkeypatch.setattr("app.core.config.OPENCODE_API_KEY", "o")
    monkeypatch.setattr("app.core.config.GEMINI_MODEL", "gemini-2.0-flash")
    monkeypatch.setattr("app.core.config.OPENCODE_MODEL_ID", "deepseek-v4-flash")

    status = AiService().status()
    assert status["available"] == ["gemini", "opencode"]
    assert status["default"] == "gemini"
    assert status["voice_available"] is True
    assert len(status["providers"]) == 2
    assert status["providers"][0]["is_default"] is True


def test_ai_service_validate_messages():
    import asyncio

    service = AiService()
    with pytest.raises(ValueError):
        asyncio.run(service.chat([]))
    with pytest.raises(ValueError):
        asyncio.run(
            service.chat([AiChatMessage(role="assistant", content="hi")])
        )


def test_ai_service_chat_unconfigured_provider(monkeypatch):
    import asyncio

    monkeypatch.setattr("app.core.config.GEMINI_API_KEY", "")
    monkeypatch.setattr("app.core.config.AI_PROVIDER", "gemini")

    service = AiService()
    with pytest.raises(ValueError, match="מוגדר"):
        asyncio.run(
            service.chat(
                [AiChatMessage(role="user", content="שלום")],
                provider="gemini",
            )
        )
