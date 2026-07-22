"""Règles i18n chat tâche (texte + affichage selon le lecteur)."""

from __future__ import annotations

from app.domain.employee_language import EmployeeLanguage, normalize_employee_language


def display_chat_body(
    *,
    body: str | None,
    body_translated: str | None,
    viewer_is_sender: bool,
) -> str | None:
    if viewer_is_sender:
        return body
    return body_translated or body


def display_chat_audio_transcript(
    *,
    audio_transcript: str | None,
    audio_transcript_sender: str | None,
    viewer_is_sender: bool,
) -> str | None:
    if viewer_is_sender:
        return audio_transcript_sender or audio_transcript
    return audio_transcript or audio_transcript_sender


def languages_differ(a: str | None, b: str | None) -> bool:
    return normalize_employee_language(a) != normalize_employee_language(b)


def normalize_pair(
    sender_language: str | None,
    recipient_language: str | None,
) -> tuple[EmployeeLanguage, EmployeeLanguage]:
    return (
        normalize_employee_language(sender_language),
        normalize_employee_language(recipient_language),
    )
