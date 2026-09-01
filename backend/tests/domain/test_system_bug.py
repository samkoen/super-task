from app.domain.system_bug import (
    clip_route_trail,
    has_system_bug_explanation,
    parse_trail,
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
