"""Haute parole des tâches employé."""
from __future__ import annotations

from app.domain.employee_language import normalize_employee_language
from app.domain.task_tts import normalize_tts_text
from app.services.google.google_cloud_errors import GoogleCloudError
from app.services.google.google_tts_client import synthesize_speech


class TaskTtsService:
    async def synthesize(self, *, text: str, language: str | None) -> bytes:
        cleaned = normalize_tts_text(text)
        if not cleaned:
            raise ValueError("אין טקסט להקראה")
        lang = normalize_employee_language(language)
        try:
            return await synthesize_speech(cleaned, language=lang)
        except GoogleCloudError as exc:
            raise ValueError(str(exc)) from exc
