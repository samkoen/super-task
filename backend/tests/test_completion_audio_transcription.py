"""Tests transcription audio clôture employé."""
from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from app.domain.completion_audio_transcription import build_completion_audio_transcription_prompt
from app.services.completion_audio_transcription_service import (
    transcribe_completion_audio,
    upload_url_to_path,
)


def test_upload_url_to_path():
    path = upload_url_to_path("/uploads/task_audio/abc.webm")
    assert path is not None
    assert path.name == "abc.webm"
    assert path.parent.name == "task_audio"


def test_upload_url_rejects_traversal():
    assert upload_url_to_path("/uploads/../secret.webm") is None


def test_prompt_uses_manager_language():
    prompt = build_completion_audio_transcription_prompt(manager_language="fr")
    assert "French" in prompt


def test_transcribe_returns_none_without_gemini(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(
        "app.services.completion_audio_transcription_service.is_voice_ai_configured",
        lambda: False,
    )
    result = asyncio.run(transcribe_completion_audio("/uploads/task_audio/x.webm", manager_language="he"))
    assert result is None


def test_transcribe_reads_file_and_calls_gemini(monkeypatch, tmp_path: Path):
    audio_dir = tmp_path / "task_audio"
    audio_dir.mkdir()
    audio_file = audio_dir / "msg.webm"
    audio_file.write_bytes(b"fake-audio")

    monkeypatch.setattr(
        "app.services.completion_audio_transcription_service.UPLOADS_DIR",
        tmp_path,
    )
    monkeypatch.setattr(
        "app.services.completion_audio_transcription_service.is_voice_ai_configured",
        lambda: True,
    )

    async def fake_generate(audio_bytes, mime, prompt, *, system_instruction=None):
        assert audio_bytes == b"fake-audio"
        assert "Hebrew" in prompt
        assert system_instruction and "Hebrew" in system_instruction
        return "  המשימה בוצעה  "

    monkeypatch.setattr(
        "app.services.completion_audio_transcription_service.generate_from_audio",
        fake_generate,
    )

    result = asyncio.run(
        transcribe_completion_audio(
            "/uploads/task_audio/msg.webm",
            manager_language="he",
        )
    )
    assert result == "המשימה בוצעה"
