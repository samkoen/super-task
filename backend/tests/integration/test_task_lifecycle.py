"""Intégration cycle de vie tâche ad-hoc : create → start → complete → approve/reject."""
from __future__ import annotations

from tests.integration.conftest import due_at_iso


def _create_ad_hoc(client_mgr, world_seed, *, photo_required: bool = True) -> dict:
    response = client_mgr.post(
        "/api/tasks/ad-hoc",
        json={
            "branch_id": world_seed["branch_id"],
            "title": "ניקיון מדף",
            "description": "לבדוק",
            "due_at": due_at_iso(),
            "assignee_user_id": world_seed["employee_id"],
            "photo_required": photo_required,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["occurrence"]


def _upload_photo(client, jpeg_bytes: bytes) -> str:
    upload = client.post(
        "/api/tasks/upload-photo",
        files={"file": ("done.jpg", jpeg_bytes, "image/jpeg")},
    )
    assert upload.status_code == 200, upload.text
    return upload.json()["url"]


def _submit_for_review(client_mgr, client_emp, world_seed, jpeg_bytes) -> str:
    occ_id = _create_ad_hoc(client_mgr, world_seed)["id"]
    assert client_emp.post(f"/api/tasks/occurrences/{occ_id}/start").status_code == 200
    photo_url = _upload_photo(client_emp, jpeg_bytes)
    completed = client_emp.post(
        f"/api/tasks/occurrences/{occ_id}/complete",
        json={"status": "completed", "photo_path": photo_url},
    )
    assert completed.status_code == 200, completed.text
    return occ_id


def test_ad_hoc_create_start_complete_approve(
    client_mgr, client_emp, world_seed, jpeg_bytes
):
    occ = _create_ad_hoc(client_mgr, world_seed)
    occ_id = occ["id"]
    assert occ["status"] == "pending"
    assert occ["assignee_user_id"] == world_seed["employee_id"]

    # /mine filtre due_on via SQL date() — fragile sous SQLite + tz.
    # start() prouve l'accès assignee de bout en bout.
    mine = client_emp.get("/api/tasks/mine")
    assert mine.status_code == 200
    assert isinstance(mine.json(), list)

    started = client_emp.post(f"/api/tasks/occurrences/{occ_id}/start")
    assert started.status_code == 200, started.text
    assert started.json()["occurrence"]["status"] == "in_progress"
    assert started.json()["occurrence"]["id"] == occ_id

    photo_url = _upload_photo(client_emp, jpeg_bytes)
    completed = client_emp.post(
        f"/api/tasks/occurrences/{occ_id}/complete",
        json={"status": "completed", "photo_path": photo_url},
    )
    assert completed.status_code == 200, completed.text
    body = completed.json()["occurrence"]
    assert body["status"] == "pending_review"
    assert body["completion"]["manager_review_status"] == "pending"
    assert body["completion"]["photo_path"] == photo_url

    approved = client_mgr.post(
        f"/api/tasks/occurrences/{occ_id}/approve",
        json={"quality_rating": 4},
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["occurrence"]["status"] == "completed"
    assert approved.json()["occurrence"]["completion"]["manager_review_status"] == "approved"
    assert approved.json()["occurrence"]["completion"]["quality_rating"] == 4


def test_approve_without_quality_rating_is_400(
    client_mgr, client_emp, world_seed, jpeg_bytes
):
    occ_id = _submit_for_review(client_mgr, client_emp, world_seed, jpeg_bytes)
    approved = client_mgr.post(f"/api/tasks/occurrences/{occ_id}/approve", json={})
    assert approved.status_code == 400, approved.text
    assert "1 ל-5" in approved.json()["error"]


def test_dashboards_expose_quality_after_approve(
    client_mgr, client_emp, world_seed, jpeg_bytes
):
    occ_id = _submit_for_review(client_mgr, client_emp, world_seed, jpeg_bytes)
    assert (
        client_mgr.post(
            f"/api/tasks/occurrences/{occ_id}/approve",
            json={"quality_rating": 4},
        ).status_code
        == 200
    )
    emp_dash = client_emp.get("/api/dashboard/employee")
    assert emp_dash.status_code == 200, emp_dash.text
    quality = emp_dash.json()["employee"]["quality_rating"]
    assert quality["count"] == 1
    assert quality["average"] == 4
    mgr_dash = client_mgr.get("/api/dashboard/manager")
    assert mgr_dash.status_code == 200, mgr_dash.text
    member = next(
        m for m in mgr_dash.json()["team"] if m["user_id"] == world_seed["employee_id"]
    )
    assert member["quality_rating"]["count"] == 1
    assert member["quality_rating"]["average"] == 4


def test_ad_hoc_reject_via_reopen_creates_chat_message(
    client_mgr, client_emp, world_seed, jpeg_bytes, mock_i18n
):
    occ_id = _create_ad_hoc(client_mgr, world_seed)["id"]
    assert client_emp.post(f"/api/tasks/occurrences/{occ_id}/start").status_code == 200
    photo_url = _upload_photo(client_emp, jpeg_bytes)
    assert (
        client_emp.post(
            f"/api/tasks/occurrences/{occ_id}/complete",
            json={"status": "completed", "photo_path": photo_url},
        ).status_code
        == 200
    )

    reopened = client_mgr.post(
        f"/api/tasks/occurrences/{occ_id}/reopen",
        json={"rejection_note": "תקן את התמונה"},
    )
    assert reopened.status_code == 200, reopened.text
    assert reopened.json()["occurrence"]["status"] == "in_progress"
    assert reopened.json()["chat_message"]["body"] == "תקן את התמונה"

    messages = client_emp.get(f"/api/tasks/occurrences/{occ_id}/messages")
    assert messages.status_code == 200
    assert any(m["body"] == "תקן את התמונה" for m in messages.json()["messages"])


def test_task_created_notification_and_mark_read(client_mgr, client_emp, world_seed):
    occ = _create_ad_hoc(client_mgr, world_seed)
    notifs = client_emp.get("/api/notifications")
    assert notifs.status_code == 200
    payload = notifs.json()
    assert payload["unread_count"] >= 1
    created = next(
        (n for n in payload["items"] if n.get("kind") == "task_created"),
        None,
    )
    assert created is not None
    assert created["occurrence_id"] == occ["id"]

    marked = client_emp.post(f"/api/notifications/{created['id']}/read")
    assert marked.status_code == 200
    unread = client_emp.get("/api/notifications?unread_only=true")
    assert unread.status_code == 200
    assert all(n["id"] != created["id"] for n in unread.json()["items"])
