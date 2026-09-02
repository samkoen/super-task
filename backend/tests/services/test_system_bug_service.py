from unittest.mock import MagicMock

import pytest

from app.domain.scope import ActorContext
from app.domain import roles
from app.services.system_bug_service import SystemBugService


def _actor() -> ActorContext:
    return ActorContext(user_id="e1", role=roles.EMPLOYEE, network_id="n1", branch_id="b1")


def test_submit_sends_mail_with_screenshot(monkeypatch):
    sent = []

    def fake_deliver(**kwargs):
        sent.append(kwargs)
        return True

    monkeypatch.setattr(
        "app.services.system_bug_service.SYSTEM_BUG_EMAIL",
        "skoen7665210@gmail.com,Bircat9172@gmail.com",
    )
    monkeypatch.setattr("app.services.system_bug_service.deliver_html_email", fake_deliver)
    result = SystemBugService().submit(
        _actor(),
        note="הכפתור לא עובד",
        route="/employee",
        trail_raw='["/manager","/employee"]',
        app_version="0.1.0",
        screenshot=b"png",
        audio=None,
    )
    assert result["ok"] is True
    assert "/employee" in result["subject"]
    assert [row["to_email"] for row in sent] == [
        "skoen7665210@gmail.com",
        "Bircat9172@gmail.com",
    ]
    assert sent[0]["kind"] == "system-bug"
    assert sent[0]["attachments"][0][0] == "screenshot.png"


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
        )
