"""Intégration alertes chat tâche : notification non lue, lecture ≠ clôture."""
from __future__ import annotations


def _messages_url(occurrence_id: str) -> str:
    return f"/api/tasks/occurrences/{occurrence_id}/messages"


def _unread_kinds(client, occurrence_id: str) -> list[str]:
    response = client.get("/api/notifications", params={"unread_only": True})
    assert response.status_code == 200, response.text
    return [
        item["kind"]
        for item in response.json()["items"]
        if item.get("occurrence_id") == occurrence_id
    ]


def test_employee_message_creates_unread_manager_chat_alert(
    client_emp, client_mgr, occurrence_id, mock_i18n
):
    posted = client_emp.post(_messages_url(occurrence_id), json={"body": "שאלה"})
    assert posted.status_code == 201, posted.text
    kinds = _unread_kinds(client_mgr, occurrence_id)
    assert "task_message_employee" in kinds
    listed = client_mgr.get(_messages_url(occurrence_id))
    assert listed.status_code == 200
    assert "task_message_employee" in _unread_kinds(client_mgr, occurrence_id)
    assert posted.json()["occurrence"]["status"] == "awaiting_response"
    after = client_mgr.get(f"/api/tasks/occurrences/{occurrence_id}")
    assert after.status_code == 200
    assert after.json()["status"] == "awaiting_response"
    assert not after.json().get("chat_resolved_at")


def test_manager_reply_creates_unread_employee_chat_alert(
    client_emp, client_mgr, occurrence_id, mock_i18n
):
    assert client_emp.post(_messages_url(occurrence_id), json={"body": "שאלה"}).status_code == 201
    reply = client_mgr.post(_messages_url(occurrence_id), json={"body": "תשובה"})
    assert reply.status_code == 201, reply.text
    kinds = _unread_kinds(client_emp, occurrence_id)
    assert "task_message_manager" in kinds
    assert client_emp.get(_messages_url(occurrence_id)).status_code == 200
    assert "task_message_manager" in _unread_kinds(client_emp, occurrence_id)
