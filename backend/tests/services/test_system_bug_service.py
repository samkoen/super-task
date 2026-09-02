from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.domain.scope import ActorContext
from app.domain import roles
from app.domain.system_bug import SystemBugIdentity
from app.integrations.github.client import GitHubApiError
from app.services.system_bug_service import SystemBugService, resolve_system_bug_identity


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
        screenshot=b"png",
        audio=None,
        identity=_identity(),
    )
    html = sent[0]["html_content"]
    assert result["ok"] is True
    assert "/employee" in result["subject"]
    assert [row["to_email"] for row in sent] == [
        "skoen7665210@gmail.com",
        "Bircat9172@gmail.com",
    ]
    assert sent[0]["kind"] == "system-bug"
    assert sent[0]["attachments"][0][0] == "screenshot.png"
    assert "דני כהן" in html
    assert "שפע" in html
    assert "רמי לוי" in html
    assert "e1" not in html
    assert "n1" not in html
    assert "b1" not in html


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
    assert len(sent) == 2


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
