"""Traduction d'un texte court vers la langue de l'employé."""
from __future__ import annotations

import logging

from app.domain.employee_language import EmployeeLanguage, normalize_employee_language
from app.domain.google_cloud_languages import translate_source_code, translate_target_code
from app.services.google.google_cloud_errors import GoogleCloudError
from app.services.google.google_translate_client import is_configured as google_translate_configured
from app.services.google.google_translate_client import translate_texts

logger = logging.getLogger(__name__)


async def localize_text(
    text: str,
    *,
    source_language: EmployeeLanguage | str,
    target_language: EmployeeLanguage | str,
) -> str:
    cleaned = (text or "").strip()
    if not cleaned:
        return ""
    source = normalize_employee_language(source_language)
    target = normalize_employee_language(target_language)
    if source == target or not google_translate_configured():
        return cleaned
    try:
        translated = await translate_texts(
            [cleaned],
            target=translate_target_code(target),
            source=translate_source_code(source),
        )
    except GoogleCloudError as exc:
        logger.warning("Text translation failed: %s", exc)
        return cleaned
    return (translated[0] if translated else cleaned).strip() or cleaned
