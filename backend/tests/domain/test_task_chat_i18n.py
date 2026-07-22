"""Tests i18n affichage chat."""
from app.domain.task_chat_i18n import (
    display_chat_audio_transcript,
    display_chat_body,
    languages_differ,
)


def test_display_body_sender_sees_original():
    assert (
        display_chat_body(
            body="hello",
            body_translated="שלום",
            viewer_is_sender=True,
        )
        == "hello"
    )


def test_display_body_recipient_sees_translation():
    assert (
        display_chat_body(
            body="hello",
            body_translated="שלום",
            viewer_is_sender=False,
        )
        == "שלום"
    )


def test_display_body_falls_back_to_original():
    assert (
        display_chat_body(
            body="hello",
            body_translated=None,
            viewer_is_sender=False,
        )
        == "hello"
    )


def test_display_audio_transcript_roles():
    assert (
        display_chat_audio_transcript(
            audio_transcript="manager text",
            audio_transcript_sender="employee text",
            viewer_is_sender=True,
        )
        == "employee text"
    )
    assert (
        display_chat_audio_transcript(
            audio_transcript="manager text",
            audio_transcript_sender="employee text",
            viewer_is_sender=False,
        )
        == "manager text"
    )


def test_languages_differ():
    assert languages_differ("he", "th")
    assert not languages_differ("he", "HE")
