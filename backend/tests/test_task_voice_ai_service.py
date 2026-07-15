"""Tests TaskVoiceAiService — configuration voix."""
from __future__ import annotations

import asyncio
from unittest.mock import MagicMock

import pytest

from app.domain.scope import ActorContext
from app.services.task_voice_ai_service import TaskVoiceAiService


def _actor() -> ActorContext:
    return ActorContext(
        user_id="bm1",
        role="branch_manager",
        network_id="r1",
        branch_id="s1",
    )


def test_voice_requires_gemini_even_when_opencode_default(monkeypatch):
    monkeypatch.setattr("app.core.config.AI_PROVIDER", "opencode")
    monkeypatch.setattr("app.core.config.OPENCODE_API_KEY", "oc-key")
    monkeypatch.setattr("app.core.config.GEMINI_API_KEY", "")

    service = TaskVoiceAiService(MagicMock(), MagicMock())

    with pytest.raises(ValueError, match="ללא קשר ל-AI_PROVIDER"):
        asyncio.run(
            service.parse_voice_message(
                _actor(),
                branch_id="s1",
                task_kind="ad_hoc",
                audio_bytes=b"audio",
                mime_type="audio/webm",
            )
        )
