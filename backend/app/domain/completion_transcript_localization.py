"""Localisation transcript audio clôture (manager ↔ employé)."""
from __future__ import annotations

from app.domain.employee_language import EmployeeLanguage
from app.domain.text_localization import localize_text


async def localize_completion_transcript(
    transcript: str | None,
    *,
    source_language: EmployeeLanguage,
    target_language: EmployeeLanguage,
) -> str | None:
    text = (transcript or "").strip()
    if not text:
        return None
    return await localize_text(
        text, source_language=source_language, target_language=target_language
    )
