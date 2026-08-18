from app.domain.audio_transcription_fallback import (
    transcript_or_unavailable,
    transcription_unavailable_message,
)


def test_hebrew_fallback_mentions_listen():
    text = transcription_unavailable_message("he")
    assert "לא ניתן היה לתמלל" in text
    assert "להאזין" in text


def test_unknown_language_defaults_to_hebrew():
    assert transcription_unavailable_message("xx") == transcription_unavailable_message("he")


def test_keeps_real_transcript():
    assert transcript_or_unavailable("  ניקוי המדף  ", "he") == "ניקוי המדף"


def test_empty_transcript_uses_fallback():
    assert transcript_or_unavailable("  ", "fr") == transcription_unavailable_message("fr")
