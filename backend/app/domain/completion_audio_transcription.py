"""Prompt transcription message vocal employé → langue manager."""
from __future__ import annotations

from app.domain.employee_language import LANGUAGE_NAMES_EN, EmployeeLanguage, normalize_employee_language


def build_completion_audio_transcription_prompt(*, manager_language: EmployeeLanguage) -> str:
    lang_name = LANGUAGE_NAMES_EN[normalize_employee_language(manager_language)]
    return f"""Listen to this voice message from a supermarket employee about a task they completed.
The employee may speak any language. Write a clear, faithful summary in {lang_name} for the branch manager to read.
Rules:
- TRANSCRIBE and translate into {lang_name} only
- Do not invent details that were not spoken
- Keep it concise (1–4 sentences)
- Return ONLY the transcript text (no JSON, no markdown, no quotes, no preamble)
- If the audio is empty or unintelligible, return an empty string"""


def build_completion_audio_system_instruction(*, manager_language: EmployeeLanguage) -> str:
    lang_name = LANGUAGE_NAMES_EN[normalize_employee_language(manager_language)]
    return (
        f"You transcribe employee task completion voice messages into {lang_name} for managers. "
        "Reply with plain text only."
    )
