"""Texte de repli quand Gemini ne peut pas transcrire un audio."""
from __future__ import annotations

from app.domain.employee_language import EmployeeLanguage, normalize_employee_language

TRANSCRIPTION_UNAVAILABLE: dict[EmployeeLanguage, str] = {
    "he": "לא ניתן היה לתמלל את ההקלטה. אפשר להאזין להודעה המוקלטת.",
    "ar": "تعذر تفريغ التسجيل. يمكن الاستماع إلى الرسالة الصوتية.",
    "th": "ไม่สามารถถอดเสียงได้ สามารถฟังข้อความที่บันทึกไว้ได้",
    "fr": "La transcription n'a pas pu être effectuée. Vous pouvez écouter l'enregistrement.",
    "en": "The recording could not be transcribed. You can listen to the audio message.",
}


def transcription_unavailable_message(language: str | None) -> str:
    lang = normalize_employee_language(language)
    return TRANSCRIPTION_UNAVAILABLE[lang]


def transcript_or_unavailable(raw: str | None, language: str | None) -> str:
    text = (raw or "").strip()
    if text:
        return text
    return transcription_unavailable_message(language)
