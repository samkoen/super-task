"""Intégration POST /api/system-bugs : e-mail + issue GitHub optionnelle."""
from __future__ import annotations


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
