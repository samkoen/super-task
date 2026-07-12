"""Langues préférées des employés."""
from __future__ import annotations

from typing import Literal

EmployeeLanguage = Literal["he", "ar", "th", "fr", "en"]

SUPPORTED_LANGUAGES: tuple[EmployeeLanguage, ...] = ("he", "ar", "th", "fr", "en")

LANGUAGE_LABELS_HE: dict[EmployeeLanguage, str] = {
    "he": "עברית",
    "ar": "ערבית",
    "th": "תאילנדית",
    "fr": "צרפתית",
    "en": "אנגלית",
}

LANGUAGE_NAMES_EN: dict[EmployeeLanguage, str] = {
    "he": "Hebrew",
    "ar": "Arabic",
    "th": "Thai",
    "fr": "French",
    "en": "English",
}

SPEECH_LOCALES: dict[EmployeeLanguage, str] = {
    "he": "he-IL",
    "ar": "ar-SA",
    "th": "th-TH",
    "fr": "fr-FR",
    "en": "en-US",
}


def normalize_employee_language(raw: str | None, default: EmployeeLanguage = "he") -> EmployeeLanguage:
    code = (raw or "").strip().lower()
    if code in SUPPORTED_LANGUAGES:
        return code  # type: ignore[return-value]
    return default


def needs_translation(language: EmployeeLanguage) -> bool:
    return language != "he"


def speech_locale(language: EmployeeLanguage) -> str:
    return SPEECH_LOCALES[normalize_employee_language(language)]
