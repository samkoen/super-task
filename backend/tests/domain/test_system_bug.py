import pytest

from app.domain.system_bug import (
    SYSTEM_BUG_STATUS_CLOSED,
    SYSTEM_BUG_STATUS_OPEN,
    SystemBugIdentity,
    clip_route_trail,
    has_system_bug_explanation,
    mail_safe_audio_attachment,
    mail_safe_audio_filename,
    parse_system_bug_emails,
    parse_system_bug_status,
    system_bug_recipients,
    parse_trail,
    system_bug_issue_body,
    system_bug_meta_rows,
    system_bug_subject,
)


def test_subject_includes_route_role_version():
    subject = system_bug_subject(route="/employee", role="employee", version="0.1.0")
    assert subject == "[סופר-מן] תקלה · /employee · employee · 0.1.0"


def test_explanation_needs_text_or_audio():
    assert has_system_bug_explanation("", has_audio=False) is False
    assert has_system_bug_explanation("  ", has_audio=False) is False
    assert has_system_bug_explanation("נפל", has_audio=False) is True
    assert has_system_bug_explanation("", has_audio=True) is True


def test_trail_keeps_last_eight_and_parses_json():
    paths = [f"/p{i}" for i in range(12)]
    assert clip_route_trail(paths) == paths[-8:]
    assert parse_trail('["/a","/b"]') == ["/a", "/b"]
    assert parse_trail("/a,/b") == ["/a", "/b"]


def test_parse_system_bug_emails_splits_and_dedupes():
    assert parse_system_bug_emails(
        "skoen7665210@gmail.com, Bircat9172@gmail.com,skoen7665210@gmail.com"
    ) == ["skoen7665210@gmail.com", "Bircat9172@gmail.com"]
    assert parse_system_bug_emails("  ") == []


def test_mail_safe_audio_accepts_wav_not_webm():
    wav = b"RIFF\x00\x00\x00\x00WAVEfmt "
    assert mail_safe_audio_filename(wav) == "explanation.wav"
    assert mail_safe_audio_filename(b"ID3xxxx") == "explanation.mp3"
    assert mail_safe_audio_filename(b"webm-bytes") is None
    assert mail_safe_audio_attachment(wav) == ("explanation.wav", wav)


def test_system_bug_recipients_always_include_both_addresses():
    assert system_bug_recipients("skoen7665210@gmail.com") == [
        "skoen7665210@gmail.com",
        "Bircat9172@gmail.com",
    ]
    assert system_bug_recipients("  ") == [
        "skoen7665210@gmail.com",
        "Bircat9172@gmail.com",
    ]


def _identity() -> SystemBugIdentity:
    return SystemBugIdentity(user_name="דני כהן", branch_name="שפע", network_name="רמי לוי")


def test_meta_rows_use_names_not_ids():
    rows = dict(
        system_bug_meta_rows(
            identity=_identity(),
            role="employee",
            route="/employee",
            trail=["/manager"],
            version="0.1.0",
            extra={},
        )
    )
    assert rows["משתמש"] == "דני כהן"
    assert rows["סניף"] == "שפע"
    assert rows["רשת"] == "רמי לוי"


def test_issue_body_mentions_audio_mail_only_without_blob():
    body = system_bug_issue_body(
        note="נפל",
        route="/employee",
        trail=[],
        version="0.1.0",
        identity=_identity(),
        role="employee",
        extra={},
        has_audio=True,
        has_screenshot=True,
    )
    assert "דני כהן" in body
    assert "e1" not in body
    assert "הקלטה מצורפת למייל" in body
    assert "webm" not in body
    assert "צילום מסך מצורף למייל" in body


def test_audio_blob_meta_keeps_wav_and_falls_back_webm():
    from app.domain.system_bug import audio_blob_meta

    wav = b"RIFF\x00\x00\x00\x00WAVEfmt "
    assert audio_blob_meta(wav) == (".wav", "audio/wav")
    assert audio_blob_meta(b"not-mail-safe") == (".webm", "audio/webm")
    assert audio_blob_meta(None) is None


def test_inbox_allows_yitzhak_name_variants():
    from app.domain.system_bug import can_view_system_bug_inbox, normalize_person_name

    assert normalize_person_name("יצחק ריצ'רד") == "יצחק ריצרד"
    assert can_view_system_bug_inbox(full_name="יצחק ריצרד") is True
    assert can_view_system_bug_inbox(full_name="יצחק ריצ'רד") is True
    assert can_view_system_bug_inbox(full_name="דני כהן") is False
    assert can_view_system_bug_inbox(full_name="דני", user_id="u1", extra_user_ids=("u1",)) is True
    assert can_view_system_bug_inbox(full_name="דני", user_id="u2", extra_user_ids=("u1",)) is False


def test_parse_system_bug_status_open_or_closed():
    assert parse_system_bug_status(None) == SYSTEM_BUG_STATUS_OPEN
    assert parse_system_bug_status("OPEN") == SYSTEM_BUG_STATUS_OPEN
    assert parse_system_bug_status("closed") == SYSTEM_BUG_STATUS_CLOSED
    with pytest.raises(ValueError, match="סטטוס"):
        parse_system_bug_status("done")
