"""Intégration דיווח בעיה : employé crée, manager liste + notif."""
from __future__ import annotations


def test_employee_creates_issue_manager_lists_and_gets_notification(
    client_emp, client_mgr
):
    created = client_emp.post(
        "/api/issue-reports",
        json={"text": "המקרר לא עובד"},
    )
    assert created.status_code == 200, created.text
    report = created.json()["report"]
    assert report["text"] == "המקרר לא עובד"
    report_id = report["id"]

    listed = client_mgr.get("/api/issue-reports")
    assert listed.status_code == 200, listed.text
    items = listed.json()["items"]
    assert any(item["id"] == report_id for item in items)

    notifs = client_mgr.get("/api/notifications")
    assert notifs.status_code == 200
    assert any(
        n.get("kind") == "issue_reported" and n.get("issue_report_id") == report_id
        for n in notifs.json()["items"]
    )


def test_employee_cannot_list_or_delete_issue_reports(client_emp, client_mgr):
    created = client_emp.post(
        "/api/issue-reports",
        json={"text": "נזילה"},
    )
    assert created.status_code == 200
    report_id = created.json()["report"]["id"]

    assert client_emp.get("/api/issue-reports").status_code == 403
    assert client_emp.delete(f"/api/issue-reports/{report_id}").status_code == 403
    assert client_mgr.delete(f"/api/issue-reports/{report_id}").status_code == 200
