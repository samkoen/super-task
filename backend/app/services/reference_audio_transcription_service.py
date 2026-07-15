"""Transcription audio de référence tâche (manager → texte description)."""
from __future__ import annotations

import logging

from app.domain.ai_provider import is_voice_ai_configured
from app.domain.employee_language import normalize_employee_language
from app.domain.reference_audio_transcription import (
    build_reference_audio_system_instruction,
    build_reference_audio_transcription_prompt,
)
from app.services.ai.gemini_client import GeminiError, generate_from_audio
from app.services.completion_audio_transcription_service import (
    _mime_for_path,
    upload_url_to_path,
)

logger = logging.getLogger(__name__)


async def transcribe_reference_audio(
    audio_url: str | None,
    *,
    manager_language: str | None,
) -> str | None:
    if not is_voice_ai_configured():
        return None
    file_path = upload_url_to_path(audio_url)
    if not file_path or not file_path.is_file():
        return None

    manager_lang = normalize_employee_language(manager_language)
    prompt = build_reference_audio_transcription_prompt(manager_language=manager_lang)
    system = build_reference_audio_system_instruction(manager_language=manager_lang)
    try:
        raw = await generate_from_audio(
            file_path.read_bytes(),
            _mime_for_path(file_path),
            prompt,
            system_instruction=system,
        )
    except GeminiError as exc:
        logger.warning("Reference audio transcription failed: %s", exc)
        return None

    text = (raw or "").strip()
    return text or None
