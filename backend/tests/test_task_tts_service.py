"""Tests TTS tâches employé."""
from __future__ import annotations

import asyncio

import pytest

from app.domain.task_tts import normalize_tts_text
from app.services.task_tts_service import TaskTtsService


def test_normalize_tts_text_trims_and_limits():
    assert normalize_tts_text("  hello  ") == "hello"
    assert len(normalize_tts_text("x" * 2000)) == 1500


def test_task_tts_service_synthesize(monkeypatch):
    captured: dict = {}

    async def fake_synthesize(text: str, *, language: str | None):
        captured["text"] = text
        captured["language"] = language
        return b"mp3-bytes"

    monkeypatch.setattr(
        "app.services.task_tts_service.synthesize_speech",
        fake_synthesize,
    )
    service = TaskTtsService()
    result = asyncio.run(service.synthesize(text="  مرحبا  ", language="ar"))
    assert result == b"mp3-bytes"
    assert captured == {"text": "مرحبا", "language": "ar"}


def test_task_tts_service_rejects_empty_text():
    service = TaskTtsService()
    with pytest.raises(ValueError, match="אין טקסט"):
        asyncio.run(service.synthesize(text="   ", language="fr"))
