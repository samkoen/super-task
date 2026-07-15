"""Prompt transcription audio de référence manager → description."""
from __future__ import annotations

from app.domain.employee_language import LANGUAGE_NAMES_EN, EmployeeLanguage, normalize_employee_language


def build_reference_audio_transcription_prompt(*, manager_language: EmployeeLanguage) -> str:
    lang_name = LANGUAGE_NAMES_EN[normalize_employee_language(manager_language)]
    return f"""Listen to this voice message from a supermarket branch manager describing a task instruction.
The manager speaks {lang_name}. Transcribe faithfully what was said.
Rules:
- Write in {lang_name} only
- Do not invent details that were not spoken
- Keep it concise (1–6 sentences)
- Return ONLY the transcript text (no JSON, no markdown, no quotes)
- If the audio is empty or unintelligible, return an empty string"""


def build_reference_audio_system_instruction(*, manager_language: EmployeeLanguage) -> str:
    lang_name = LANGUAGE_NAMES_EN[normalize_employee_language(manager_language)]
    return (
        f"You transcribe manager task reference voice messages into {lang_name}. "
        "Reply with plain text only."
    )
