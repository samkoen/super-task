"""Transcription audio de clôture tâche (employé → langue manager)."""
from __future__ import annotations

import logging
from pathlib import Path

from app.domain.ai_provider import is_voice_ai_configured
from app.domain.completion_audio_transcription import (
    build_completion_audio_system_instruction,
    build_completion_audio_transcription_prompt,
)
from app.domain.employee_language import normalize_employee_language
from app.services.ai.gemini_client import GeminiError, generate_from_audio
from app.services import blob_storage

logger = logging.getLogger(__name__)

_AUDIO_MIME: dict[str, str] = {
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
}


def upload_url_to_path(url: str | None) -> Path | None:
    """Compat tests / local : résout un chemin /uploads/... (pas les URLs Blob)."""
    if not url or not url.strip():
        return None
    if blob_storage.is_remote_media_url(url):
        return None
    relative = url.strip().lstrip("/")
    if relative.startswith("uploads/"):
        relative = relative[len("uploads/") :]
    if not relative or ".." in relative.replace("\\", "/"):
        return None
    from app.core.config import UPLOADS_DIR

    return UPLOADS_DIR / relative


def _mime_for_suffix(suffix: str) -> str:
    return _AUDIO_MIME.get(suffix.lower(), "audio/webm")


async def transcribe_completion_audio(
    audio_path: str | None,
    *,
    manager_language: str | None,
) -> str | None:
    if not is_voice_ai_configured():
        return None
    payload = blob_storage.read_media_bytes(audio_path)
    if not payload:
        return None
    audio_bytes, suffix = payload

    manager_lang = normalize_employee_language(manager_language)
    prompt = build_completion_audio_transcription_prompt(manager_language=manager_lang)
    system = build_completion_audio_system_instruction(manager_language=manager_lang)
    try:
        raw = await generate_from_audio(
            audio_bytes,
            _mime_for_suffix(suffix),
            prompt,
            system_instruction=system,
        )
    except GeminiError as exc:
        logger.warning("Completion audio transcription failed: %s", exc)
        return None

    text = (raw or "").strip()
    return text or None
