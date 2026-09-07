from io import BytesIO
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from PIL import Image

from app.domain.scope import ActorContext
from app.domain import roles
from app.domain.system_bug import SystemBugIdentity
from app.integrations.github.client import GitHubApiError
from app.services.system_bug_service import SystemBugService, resolve_system_bug_identity


def _wav_bytes() -> bytes:
    return b"RIFF\x00\x00\x00\x00WAVEfmt "


def _png_shot() -> bytes:
    buf = BytesIO()
    Image.new("RGB", (120, 80), (10, 20, 30)).save(buf, format="PNG")
    return buf.getvalue()


def _actor() -> ActorContext:
    return ActorContext(user_id="e1", role=roles.EMPLOYEE, network_id="n1", branch_id="b1")


def _identity() -> SystemBugIdentity:
    return SystemBugIdentity(user_name="דני כהן", branch_name="שפע", network_name="רמי לוי")


def _patch_mail(monkeypatch):
    sent = []

    def fake_deliver(**kwargs):
        sent.append(kwargs)
        return True

    monkeypatch.setattr(
        "app.services.system_bug_service.SYSTEM_BUG_EMAIL",
        "skoen7665210@gmail.com,Bircat9172@gmail.com",
    )
    monkeypatch.setattr("app.services.system_bug_service.deliver_html_email", fake_deliver)
    monkeypatch.setattr("app.services.system_bug_service.github_issues_enabled", lambda: False)
    return sent


def test_submit_sends_mail_with_names_not_ids(monkeypatch):
    sent = _patch_mail(monkeypatch)
    result = SystemBugService().submit(
        _actor(),
        note="הכפתור לא עובד",
        route="/employee",
        trail_raw='["/manager","/employee"]',
        app_version="0.1.0",
        screenshot=_png_shot(),
        audio=_wav_bytes(),
        identity=_identity(),
    )
    html = sent[0]["html_content"]
    names = [name for name, _ in sent[0]["attachments"]]
    assert result["ok"] is True
    assert "/employee" in result["subject"]
    assert sent[0]["to_email"] == [
        "skoen7665210@gmail.com",
        "Bircat9172@gmail.com",
    ]
    assert sent[0]["allow_simulation"] is False
    assert sent[0]["kind"] == "system-bug"
    assert names == ["screenshot.jpg", "explanation.wav"]
    assert "cid:bug-screenshot" in html
    assert "הקלטה מצורפת" in html
    assert "לא מצורפה למייל" not in html
    assert "דני כהן" in html
    assert "שפע" in html
    assert "רמי לוי" in html
    assert "e1" not in html
    assert "n1" not in html
    assert "b1" not in html


def test_submit_adds_second_required_address(monkeypatch):
    sent = _patch_mail(monkeypatch)
    monkeypatch.setattr(
        "app.services.system_bug_service.SYSTEM_BUG_EMAIL",
        "skoen7665210@gmail.com",
    )
    SystemBugService().submit(
        _actor(),
        note="נפל",
        route="/employee",
        trail_raw="",
        app_version="0.1.0",
        screenshot=b"png",
        audio=None,
        identity=_identity(),
    )
    assert sent[0]["to_email"] == [
        "skoen7665210@gmail.com",
        "Bircat9172@gmail.com",
    ]
    assert sent[0]["allow_simulation"] is False


def test_submit_fails_if_real_email_not_sent(monkeypatch):
    monkeypatch.setattr(
        "app.services.system_bug_service.SYSTEM_BUG_EMAIL",
        "skoen7665210@gmail.com,Bircat9172@gmail.com",
    )
    monkeypatch.setattr(
        "app.services.system_bug_service.deliver_html_email",
        lambda **_k: False,
    )
    monkeypatch.setattr("app.services.system_bug_service.github_issues_enabled", lambda: True)
    with pytest.raises(RuntimeError, match="שליחת הדיווח נכשלה"):
        SystemBugService().submit(
            _actor(),
            note="נפל",
            route="/employee",
            trail_raw="",
            app_version="0.1.0",
            screenshot=b"png",
            audio=None,
            identity=_identity(),
        )


def test_submit_rejects_empty_report():
    with pytest.raises(ValueError):
        SystemBugService().submit(
            _actor(),
            note="  ",
            route="/employee",
            trail_raw="",
            app_version="1",
            screenshot=None,
            audio=None,
            identity=_identity(),
        )


def test_submit_opens_github_issue_without_audio(monkeypatch):
    sent = _patch_mail(monkeypatch)
    calls = []
    monkeypatch.setattr("app.services.system_bug_service.github_issues_enabled", lambda: True)

    def fake_issue(**kwargs):
        calls.append(kwargs)
        return "https://github.com/samkoen/super-task/issues/12"

    monkeypatch.setattr("app.services.system_bug_service.create_system_bug_issue", fake_issue)
    result = SystemBugService().submit(
        _actor(),
        note="נפל",
        route="/employee",
        trail_raw="",
        app_version="0.1.0",
        screenshot=b"png",
        audio=b"webm-bytes",
        identity=_identity(),
    )
    assert sent, "e-mail still required"
    assert result["github_issue_url"].endswith("/issues/12")
    assert calls[0]["screenshot"] == b"png"
    assert "webm-bytes" not in calls[0]["body"]
    assert "הקלטה מצורפת למייל" in calls[0]["body"]
    assert "דני כהן" in calls[0]["body"]
    assert "e1" not in calls[0]["body"]


def test_submit_keeps_email_if_github_fails(monkeypatch):
    sent = _patch_mail(monkeypatch)
    monkeypatch.setattr("app.services.system_bug_service.github_issues_enabled", lambda: True)

    def boom(**kwargs):
        raise GitHubApiError("nope")

    monkeypatch.setattr("app.services.system_bug_service.create_system_bug_issue", boom)
    result = SystemBugService().submit(
        _actor(),
        note="נפל",
        route="/employee",
        trail_raw="",
        app_version="0.1.0",
        screenshot=None,
        audio=None,
        identity=_identity(),
    )
    assert result["ok"] is True
    assert "github_issue_url" not in result
    assert len(sent) == 1
    assert sent[0]["to_email"] == [
        "skoen7665210@gmail.com",
        "Bircat9172@gmail.com",
    ]


def test_resolve_identity_uses_names_not_ids():
    user_repo = MagicMock()
    user_repo.find_by_id.return_value = SimpleNamespace(full_name="דני כהן")
    branch_repo = MagicMock()
    branch_repo.find_by_id.return_value = SimpleNamespace(name="שפע")
    branch_repo.get_network_name.return_value = "רמי לוי"
    ident = resolve_system_bug_identity(_actor(), user_repo, branch_repo, branch_name_hint="אחר")
    assert ident == SystemBugIdentity("דני כהן", "שפע", "רמי לוי")


def test_resolve_identity_falls_back_to_hint_not_guid():
    user_repo = MagicMock()
    user_repo.find_by_id.return_value = None
    branch_repo = MagicMock()
    branch_repo.find_by_id.return_value = None
    branch_repo.get_network_name.side_effect = ValueError("bad id")
    ident = resolve_system_bug_identity(_actor(), user_repo, branch_repo, branch_name_hint="שפע")
    assert ident.user_name == ""
    assert ident.branch_name == "שפע"
    assert ident.network_name == ""


def test_submit_persists_screenshot_and_audio(monkeypatch):
    _patch_mail(monkeypatch)
    stored: list[dict] = []
    repo = MagicMock()
    repo.create.return_value = SimpleNamespace(id="bug-1")

    def fake_put(**kwargs):
        stored.append(kwargs)
        return f"/uploads/{kwargs['folder']}/x{kwargs['ext']}"

    monkeypatch.setattr("app.services.system_bug_service.blob_storage.put_bytes", fake_put)
    result = SystemBugService(repo).submit(
        _actor(),
        note="הכפתור לא עובד",
        route="/employee",
        trail_raw='["/employee"]',
        app_version="0.1.0",
        screenshot=_png_shot(),
        audio=_wav_bytes(),
        identity=_identity(),
    )
    assert result["id"] == "bug-1"
    folders = {item["folder"] for item in stored}
    assert folders == {"system_bug_screenshots", "system_bug_audio"}
    kwargs = repo.create.call_args.kwargs
    assert kwargs["note"] == "הכפתור לא עובד"
    assert kwargs["screenshot_url"].startswith("/uploads/system_bug_screenshots/")
    assert kwargs["audio_url"].startswith("/uploads/system_bug_audio/")


def test_list_inbox_only_for_yitzhak():
    repo = MagicMock()
    repo.list_recent.return_value = [SimpleNamespace(to_dict=lambda: {"id": "1", "note": "נפל"})]
    users = MagicMock()
    users.find_by_id.return_value = SimpleNamespace(full_name="יצחק ריצ'רד")
    items = SystemBugService(repo, users).list_inbox(_actor())
    assert items == [{"id": "1", "note": "נפל"}]


def test_list_inbox_denies_other_user():
    users = MagicMock()
    users.find_by_id.return_value = SimpleNamespace(full_name="דני כהן")
    with pytest.raises(PermissionError, match="אין הרשאה"):
        SystemBugService(MagicMock(), users).list_inbox(_actor())


def test_delete_inbox_item_removes_media(monkeypatch):
    repo = MagicMock()
    repo.find_by_id.return_value = SimpleNamespace(
        id="bug-1",
        screenshot_url="/uploads/system_bug_screenshots/a.jpg",
        audio_url="/uploads/system_bug_audio/a.wav",
    )
    repo.delete.return_value = True
    users = MagicMock()
    users.find_by_id.return_value = SimpleNamespace(full_name="יצחק ריצ'רד")
    deleted: list[str] = []
    monkeypatch.setattr(
        "app.services.system_bug_service.blob_storage.delete_media_url",
        lambda url: deleted.append(url) if url else None,
    )
    SystemBugService(repo, users).delete_inbox_item(_actor(), "bug-1")
    assert deleted == [
        "/uploads/system_bug_screenshots/a.jpg",
        "/uploads/system_bug_audio/a.wav",
    ]
    repo.delete.assert_called_once_with("bug-1")


def test_delete_inbox_denies_other_user():
    users = MagicMock()
    users.find_by_id.return_value = SimpleNamespace(full_name="דני כהן")
    with pytest.raises(PermissionError, match="אין הרשאה"):
        SystemBugService(MagicMock(), users).delete_inbox_item(_actor(), "bug-1")
