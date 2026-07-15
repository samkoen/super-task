"""Localisation transcript audio clôture (manager ↔ employé)."""
from __future__ import annotations

import logging

from app.domain.employee_language import EmployeeLanguage, normalize_employee_language
from app.domain.google_cloud_languages import translate_source_code, translate_target_code
from app.services.google.google_cloud_errors import GoogleCloudError
from app.services.google.google_translate_client import is_configured as google_translate_configured
from app.services.google.google_translate_client import translate_texts

logger = logging.getLogger(__name__)


async def localize_completion_transcript(
    transcript: str | None,
    *,
    source_language: EmployeeLanguage,
    target_language: EmployeeLanguage,
) -> str | None:
    text = (transcript or "").strip()
    if not text:
        return None
    source = normalize_employee_language(source_language)
    target = normalize_employee_language(target_language)
    if source == target:
        return text
    if not google_translate_configured():
        return text
    try:
        translated = await translate_texts(
            [text],
            target=translate_target_code(target),
            source=translate_source_code(source),
        )
    except GoogleCloudError as exc:
        logger.warning("Completion transcript translation failed: %s", exc)
        return text
    return (translated[0] if translated else text).strip() or text
