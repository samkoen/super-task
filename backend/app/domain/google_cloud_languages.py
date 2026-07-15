"""Mapping langues employé → Google Cloud Translation / TTS."""
from __future__ import annotations

from app.core import config
from app.domain.employee_language import EmployeeLanguage, normalize_employee_language

TRANSLATE_TARGET_CODES: dict[EmployeeLanguage, str] = {
    "he": "he",
    "ar": "ar",
    "th": "th",
    "fr": "fr",
    "en": "en",
}

DEFAULT_TTS_VOICES: dict[EmployeeLanguage, str] = {
    "he": "he-IL-Wavenet-A",
    "ar": "ar-XA-Wavenet-B",
    "th": "th-TH-Neural2-C",
    "fr": "fr-FR-Neural2-A",
    "en": "en-US-Neural2-C",
}


def translate_target_code(language: str | None) -> str:
    code = normalize_employee_language(language)
    return TRANSLATE_TARGET_CODES[code]


def translate_source_code(language: str | None) -> str:
    """Code Google Translate pour la langue parlée / source du texte."""
    return translate_target_code(language)


def tts_voice_for(language: str | None) -> str:
    code = normalize_employee_language(language)
    overrides = {
        "he": config.GOOGLE_TTS_VOICE_HE,
        "ar": config.GOOGLE_TTS_VOICE_AR,
        "th": config.GOOGLE_TTS_VOICE_TH,
        "fr": config.GOOGLE_TTS_VOICE_FR,
        "en": config.GOOGLE_TTS_VOICE_EN,
    }
    return overrides.get(code) or DEFAULT_TTS_VOICES[code]


def tts_language_code(voice_name: str) -> str:
    parts = voice_name.split("-")
    if len(parts) >= 2:
        return f"{parts[0]}-{parts[1]}"
    return voice_name
