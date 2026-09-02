"""Intégration : ancienne tâche sans photo obligatoire, case photo fantôme a034."""
from __future__ import annotations

from tests.integration.conftest import due_at_iso


def _create_stale_photo_task(client_mgr, world_seed) -> str:
    created = client_mgr.post(
        "/api/tasks/ad-hoc",
        json={
            "branch_id": world_seed["branch_id"],
            "title": "משימה ישנה בלי מדיה",
            "description": "",
            "due_at": due_at_iso(),
            "assignee_user_id": world_seed["employee_id"],
            "photo_required": False,
            "completion_requirements": [{"kind": "photo"}],
        },
    )
    assert created.status_code == 201, created.text
    return created.json()["occurrence"]["id"]


def test_oved_can_finish_stale_photo_task_without_media(client_mgr, client_emp, world_seed):
    occ_id = _create_stale_photo_task(client_mgr, world_seed)
    started = client_emp.post(f"/api/tasks/occurrences/{occ_id}/start")
    assert started.status_code == 200, started.text
    done = client_emp.post(
        f"/api/tasks/occurrences/{occ_id}/complete",
        json={"status": "completed"},
    )
    assert done.status_code == 200, done.text
    body = done.json()["occurrence"]
    assert body["status"] == "pending_review"
    assert body["photo_required"] is False


def test_oved_still_must_attach_when_photo_is_required(client_mgr, client_emp, world_seed):
    created = client_mgr.post(
        "/api/tasks/ad-hoc",
        json={
            "branch_id": world_seed["branch_id"],
            "title": "עם תמונה",
            "description": "",
            "due_at": due_at_iso(),
            "assignee_user_id": world_seed["employee_id"],
            "photo_required": True,
            "completion_requirements": [{"kind": "photo"}],
        },
    )
    occ_id = created.json()["occurrence"]["id"]
    assert client_emp.post(f"/api/tasks/occurrences/{occ_id}/start").status_code == 200
    denied = client_emp.post(
        f"/api/tasks/occurrences/{occ_id}/complete",
        json={"status": "completed"},
    )
    assert denied.status_code == 400, denied.text
