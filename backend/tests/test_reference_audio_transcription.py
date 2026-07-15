"""Tests transcription audio référence manager."""
from __future__ import annotations

from app.domain.reference_audio_transcription import (
    build_reference_audio_system_instruction,
    build_reference_audio_transcription_prompt,
)


def test_reference_audio_prompt_uses_manager_language():
    prompt = build_reference_audio_transcription_prompt(manager_language="fr")
    assert "French" in prompt
    system = build_reference_audio_system_instruction(manager_language="fr")
    assert "French" in system
