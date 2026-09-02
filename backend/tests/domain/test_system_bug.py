from app.domain.system_bug import (
    SystemBugIdentity,
    clip_route_trail,
    has_system_bug_explanation,
    parse_system_bug_emails,
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
    assert "הקלטה מצורפת למייל בלבד" in body
    assert "webm" not in body
    assert "צילום מסך מצורף למייל" in body
