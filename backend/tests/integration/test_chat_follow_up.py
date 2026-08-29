"""Intégration מטלת צ׳אט : סיום מטלה + תזכורת, lecture ≠ clôture."""
from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Asia/Jerusalem")


def _messages_url(occurrence_id: str) -> str:
    return f"/api/tasks/occurrences/{occurrence_id}/messages"


def _future_iso() -> str:
    return (datetime.now(TZ) + timedelta(days=1)).isoformat()


def _find_queue_task(dashboard: dict, occurrence_id: str) -> dict | None:
    queues = dashboard.get("task_queues") or {}
    for bucket in queues.values():
        for task in bucket or []:
            if task.get("id") == occurrence_id:
                return task
    return None


def test_reading_thread_does_not_resolve_open_chat(
    client_emp, client_mgr, occurrence_id, mock_i18n
):
    posted = client_emp.post(_messages_url(occurrence_id), json={"body": "שאלה"})
    assert posted.status_code == 201
    assert posted.json()["occurrence"]["status"] == "awaiting_response"
    assert client_mgr.get(_messages_url(occurrence_id)).status_code == 200
    occ = client_mgr.get(f"/api/tasks/occurrences/{occurrence_id}")
    assert occ.json()["status"] == "awaiting_response"
    assert not occ.json().get("chat_resolved_at")


def test_manager_resolves_chat_task_to_archive(
    client_emp, client_mgr, occurrence_id, mock_i18n
):
    assert client_emp.post(_messages_url(occurrence_id), json={"body": "שאלה"}).status_code == 201
    resolved = client_mgr.post(f"/api/tasks/occurrences/{occurrence_id}/chat-resolve")
    assert resolved.status_code == 200, resolved.text
    occ = resolved.json()["occurrence"]
    assert occ["status"] == "in_progress"
    assert occ["chat_resolved_at"]
    assert not occ.get("chat_follow_up_at")
    dash = client_mgr.get("/api/dashboard/manager")
    assert dash.status_code == 200
    item = _find_queue_task(dash.json(), occurrence_id)
    assert item is None or item["status"] != "awaiting_response"


def test_new_employee_message_reopens_resolved_chat(
    client_emp, client_mgr, occurrence_id, mock_i18n
):
    assert client_emp.post(_messages_url(occurrence_id), json={"body": "אחת"}).status_code == 201
    assert client_mgr.post(f"/api/tasks/occurrences/{occurrence_id}/chat-resolve").status_code == 200
    again = client_emp.post(_messages_url(occurrence_id), json={"body": "עוד שאלה"})
    assert again.status_code == 201, again.text
    occ = again.json()["occurrence"]
    assert occ["status"] == "awaiting_response"
    assert not occ.get("chat_resolved_at")
    assert not occ.get("chat_follow_up_at")


def test_follow_up_parks_task_until_reminder(
    client_emp, client_mgr, occurrence_id, mock_i18n
):
    assert client_emp.post(_messages_url(occurrence_id), json={"body": "שאלה"}).status_code == 201
    when = _future_iso()
    parked = client_mgr.post(
        f"/api/tasks/occurrences/{occurrence_id}/chat-follow-up",
        json={"follow_up_at": when},
    )
    assert parked.status_code == 200, parked.text
    occ = parked.json()["occurrence"]
    assert occ["status"] == "awaiting_response"
    assert occ["chat_follow_up_at"]
    dash = client_mgr.get("/api/dashboard/manager")
    assert dash.status_code == 200
    item = _find_queue_task(dash.json(), occurrence_id)
    assert item is not None
    assert item["status"] == "awaiting_response"
    assert item.get("chat_follow_up_at")


def test_oved_cannot_resolve_or_set_past_follow_up(
    client_emp, client_mgr, occurrence_id, mock_i18n
):
    assert client_emp.post(_messages_url(occurrence_id), json={"body": "שאלה"}).status_code == 201
    denied = client_emp.post(f"/api/tasks/occurrences/{occurrence_id}/chat-resolve")
    assert denied.status_code == 403
    past = client_mgr.post(
        f"/api/tasks/occurrences/{occurrence_id}/chat-follow-up",
        json={"follow_up_at": (datetime.now(TZ) - timedelta(hours=1)).isoformat()},
    )
    assert past.status_code == 400
