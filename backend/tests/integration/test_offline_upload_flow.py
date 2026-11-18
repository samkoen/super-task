"""Intégration : oved sans קליטה — signal de fin d'abord, fichiers ensuite ; dernière connexion côté menahel."""
from __future__ import annotations

from tests.integration.conftest import due_at_iso
from tests.integration.test_slot_review_flow import _find_card

REQS = [{"kind": "photo", "title": "מדף"}]


def _created(client_mgr, world_seed) -> str:
    created = client_mgr.post(
        "/api/tasks/ad-hoc",
        json={
            "branch_id": world_seed["branch_id"],
            "title": "מדף בלי קליטה",
            "due_at": due_at_iso(),
            "assignee_user_id": world_seed["employee_id"],
            "photo_required": False,
            "completion_requirements": REQS,
        },
    )
    assert created.status_code == 201, created.text
    return created.json()["occurrence"]["id"]


def _photo(client, jpeg_bytes: bytes) -> str:
    upload = client.post("/api/tasks/upload-photo", files={"file": ("a.jpg", jpeg_bytes, "image/jpeg")})
    assert upload.status_code == 200, upload.text
    return upload.json()["url"]


def test_finish_signal_shows_the_task_as_done_waiting_for_files(client_mgr, client_emp, world_seed, jpeg_bytes):
    occ_id = _created(client_mgr, world_seed)
    signal = client_emp.post(
        f"/api/tasks/occurrences/{occ_id}/finished-offline", json={"finished_at": "2020-01-01T00:00:00Z"}
    )
    assert signal.status_code == 200, signal.text
    occurrence = signal.json()["occurrence"]
    assert occurrence["status"] == "in_progress"
    assert occurrence["awaiting_upload_at"]

    card = _find_card(client_mgr.get("/api/dashboard/manager").json(), occ_id)
    assert card["awaiting_upload_at"]

    sent = client_emp.post(
        f"/api/tasks/occurrences/{occ_id}/slots/0/submit",
        json={"attachment": {"kind": "photo", "url": _photo(client_emp, jpeg_bytes)}},
    )
    assert sent.status_code == 200, sent.text
    task = client_mgr.get(f"/api/tasks/occurrences/{occ_id}").json()
    assert task["status"] == "pending_review"
    assert task["awaiting_upload_at"] is None

    again = client_emp.post(f"/api/tasks/occurrences/{occ_id}/finished-offline", json={})
    assert again.status_code == 200
    assert again.json()["occurrence"]["status"] == "pending_review"
    assert again.json()["occurrence"]["awaiting_upload_at"] is None


def test_manager_sees_when_the_oved_was_last_online(client_mgr, client_emp, world_seed):
    assert client_emp.get("/api/dashboard/employee").status_code == 200
    team = client_mgr.get("/api/dashboard/manager").json()["team"]
    oved = next(m for m in team if m["user_id"] == world_seed["employee_id"])
    assert oved["last_seen_at"]
