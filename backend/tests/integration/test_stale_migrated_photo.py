"""Intégration : ancienne tâche sans photo obligatoire, case photo fantôme a034."""
from __future__ import annotations

from datetime import datetime

import app.db.session as db_session
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from tests.integration.conftest import due_at_iso


def _create_stale_photo_task(world_seed) -> str:
    """a034 a écrit [{kind: photo}] même si photo_required était faux — pas via l'API."""
    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        occ = TaskOccurrenceRepository(db).create(
            template_id=None,
            branch_id=world_seed["branch_id"],
            title="משימה ישנה בלי מדיה",
            description="",
            due_at=datetime.fromisoformat(due_at_iso()),
            assignee_user_id=world_seed["employee_id"],
            department_id=None,
            task_kind="ad_hoc",
            manager_user_id=world_seed["manager_id"],
            created_by_id=world_seed["manager_id"],
            photo_required=False,
            completion_requirements=[{"kind": "photo"}],
        )
        db.commit()
        return occ.id
    finally:
        db.close()


def test_oved_can_finish_stale_photo_task_without_media(client_emp, world_seed):
    occ_id = _create_stale_photo_task(world_seed)
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
