"""Intégration הפסקה : popup menahel + צליל דחוף, sans fermer le chat."""
from __future__ import annotations


def _messages_url(occurrence_id: str) -> str:
    return f"/api/tasks/occurrences/{occurrence_id}/messages"


def _unread(client, *, kind: str | None = None) -> list[dict]:
    response = client.get("/api/notifications", params={"unread_only": True})
    assert response.status_code == 200, response.text
    items = response.json()["items"]
    if kind is None:
        return items
    return [item for item in items if item.get("kind") == kind]


def test_manager_message_while_oved_on_break_returns_alert(
    client_emp, client_mgr, occurrence_id, mock_i18n
):
    started = client_emp.post("/api/employee-activity/break/start")
    assert started.status_code == 200, started.text
    posted = client_mgr.post(_messages_url(occurrence_id), json={"body": "דחוף"})
    assert posted.status_code == 201, posted.text
    alert = posted.json()["recipient_break"]
    assert alert["on_break"] is True
    assert alert["on_break_since"]
    state = client_emp.get("/api/employee-activity/break")
    assert state.status_code == 200
    assert state.json()["on_break"] is True


def test_listing_messages_does_not_end_the_break(
    client_emp, client_mgr, occurrence_id, mock_i18n
):
    assert client_emp.post("/api/employee-activity/break/start").status_code == 200
    assert client_mgr.post(_messages_url(occurrence_id), json={"body": "שלום"}).status_code == 201
    listed = client_emp.get(_messages_url(occurrence_id))
    assert listed.status_code == 200
    assert client_emp.get("/api/employee-activity/break").json()["on_break"] is True


def test_manager_can_ring_oved_on_break(client_emp, client_mgr, world_seed):
    assert client_emp.post("/api/employee-activity/break/start").status_code == 200
    ring = client_mgr.post(
        "/api/employee-activity/break/ring",
        json={"user_id": world_seed["employee_id"]},
    )
    assert ring.status_code == 200, ring.text
    assert ring.json()["ok"] is True
    assert ring.json()["recipient_break"]["on_break"] is True
    alerts = _unread(client_emp, kind="break_override")
    assert alerts, "expected urgent ring notification for the oved"


def test_oved_cannot_ring_and_ring_requires_break(client_emp, client_mgr, world_seed):
    denied = client_emp.post(
        "/api/employee-activity/break/ring",
        json={"user_id": world_seed["employee_id"]},
    )
    assert denied.status_code == 403
    missing = client_mgr.post(
        "/api/employee-activity/break/ring",
        json={"user_id": world_seed["employee_id"]},
    )
    assert missing.status_code == 400
