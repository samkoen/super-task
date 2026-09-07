"""Intégration POST /api/system-bugs : e-mail + issue GitHub optionnelle."""
from __future__ import annotations

from app.db import session as db_session
from app.domain import roles
from app.repositories.user_repository import UserRepository
from tests.integration.conftest import PASSWORD, login_client


def _patch_bug_delivery(monkeypatch):
    sent = []

    def fake_deliver(**kwargs):
        sent.append(kwargs)
        return True

    monkeypatch.setattr(
        "app.services.system_bug_service.SYSTEM_BUG_EMAIL",
        "qa@test.local",
    )
    monkeypatch.setattr("app.services.system_bug_service.deliver_html_email", fake_deliver)
    monkeypatch.setattr("app.services.system_bug_service.github_issues_enabled", lambda: False)
    return sent


def test_employee_submits_system_bug_by_http(client_emp, monkeypatch):
    sent = _patch_bug_delivery(monkeypatch)
    response = client_emp.post(
        "/api/system-bugs",
        data={
            "note": "הכפתור לא עובד",
            "route": "/employee",
            "trail": '["/employee"]',
            "app_version": "0.1.0",
            "branch_name": "Branch A",
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["ok"] is True
    assert "/employee" in body["subject"]
    assert sent and sent[0]["kind"] == "system-bug"
    assert "Oved Test" in sent[0]["html_content"]
    assert "Branch A" in sent[0]["html_content"]


def test_system_bug_rejects_empty_and_opens_github(client_emp, monkeypatch):
    sent = _patch_bug_delivery(monkeypatch)
    empty = client_emp.post("/api/system-bugs", data={"note": "  ", "route": "/employee"})
    assert empty.status_code == 400, empty.text

    issues = []

    def fake_issue(*, title, body, screenshot):
        issues.append({"title": title, "body": body, "screenshot": screenshot})
        return "https://github.com/samkoen/super-task/issues/99"

    monkeypatch.setattr("app.services.system_bug_service.github_issues_enabled", lambda: True)
    monkeypatch.setattr("app.services.system_bug_service.create_system_bug_issue", fake_issue)
    created = client_emp.post(
        "/api/system-bugs",
        data={"note": "נפל", "route": "/employee", "app_version": "0.1.0"},
    )
    assert created.status_code == 200, created.text
    assert created.json()["github_issue_url"].endswith("/issues/99")
    assert sent
    assert issues and issues[0]["screenshot"] is None


def test_inbox_is_only_for_yitzhak(client_emp, app, world_seed, monkeypatch):
    _patch_bug_delivery(monkeypatch)
    created = client_emp.post(
        "/api/system-bugs",
        data={"note": "הכפתור לא עובד", "route": "/employee", "app_version": "0.1.0"},
    )
    assert created.status_code == 200, created.text
    assert client_emp.get("/api/system-bugs").status_code == 403

    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        UserRepository(db).create_user(
            email="yitzhak@test.local",
            password=PASSWORD,
            first_name="יצחק",
            last_name="ריצ'רד",
            role=roles.NETWORK_MANAGER,
            email_verified=True,
            network_id=world_seed["network_id"],
        )
        db.commit()
    finally:
        db.close()

    inbox = login_client(app, "yitzhak@test.local")
    listed = inbox.get("/api/system-bugs")
    assert listed.status_code == 200, listed.text
    items = listed.json()["items"]
    assert len(items) == 1
    assert items[0]["note"] == "הכפתור לא עובד"
    detail = inbox.get(f"/api/system-bugs/{items[0]['id']}")
    assert detail.status_code == 200, detail.text
    assert detail.json()["report"]["note"] == "הכפתור לא עובד"
    me = inbox.get("/api/auth/me").json()["user"]
    assert me["can_view_system_bug_inbox"] is True
    assert client_emp.get("/api/auth/me").json()["user"]["can_view_system_bug_inbox"] is False
