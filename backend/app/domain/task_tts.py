"""Réglages TTS des tâches employé (MiniMax Speech)."""
from __future__ import annotations

from app.domain.employee_language import EmployeeLanguage, LANGUAGE_NAMES_EN, normalize_employee_language

TTS_LANGUAGE_BOOST: dict[EmployeeLanguage, str] = {
    "he": "Hebrew",
    "ar": "Arabic",
    "th": "Thai",
    "fr": "French",
    "en": "English",
}

TTS_MAX_TEXT_LENGTH = 1500


def tts_language_boost(language: str | None) -> str:
    code = normalize_employee_language(language)
    return TTS_LANGUAGE_BOOST.get(code, "auto")


def normalize_tts_text(text: str) -> str:
    cleaned = " ".join((text or "").split())
    if len(cleaned) > TTS_MAX_TEXT_LENGTH:
        return cleaned[: TTS_MAX_TEXT_LENGTH].rstrip()
    return cleaned


def tts_prompt_language_name(language: str | None) -> str:
    code = normalize_employee_language(language)
    return LANGUAGE_NAMES_EN[code]
