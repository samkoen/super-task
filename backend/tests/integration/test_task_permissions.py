"""Intégration permissions tâches (employé / cross-branch)."""
from __future__ import annotations

from tests.integration.conftest import MGR_B_EMAIL, due_at_iso, login_client


def test_employee_cannot_create_or_approve_or_list_manager_occurrences(
    client_emp, world_seed, occurrence_id
):
    create = client_emp.post(
        "/api/tasks/ad-hoc",
        json={
            "branch_id": world_seed["branch_id"],
            "title": "אין הרשאה",
            "due_at": due_at_iso(),
            "assignee_user_id": world_seed["employee_id"],
        },
    )
    assert create.status_code == 403

    approve = client_emp.post(f"/api/tasks/occurrences/{occurrence_id}/approve")
    assert approve.status_code == 403

    cancel = client_emp.post(f"/api/tasks/occurrences/{occurrence_id}/cancel")
    assert cancel.status_code == 403

    listed = client_emp.get("/api/tasks/occurrences")
    assert listed.status_code == 403


def test_other_branch_manager_cannot_access_branch_a(
    app, second_branch_seed, client_mgr
):
    created = client_mgr.post(
        "/api/tasks/ad-hoc",
        json={
            "branch_id": second_branch_seed["branch_id"],
            "title": "משימה סניף א",
            "due_at": due_at_iso(),
            "assignee_user_id": second_branch_seed["employee_id"],
            "photo_required": True,
        },
    )
    assert created.status_code == 201, created.text
    occ_id = created.json()["occurrence"]["id"]

    mgr_b = login_client(app, MGR_B_EMAIL)
    forbidden_create = mgr_b.post(
        "/api/tasks/ad-hoc",
        json={
            "branch_id": second_branch_seed["branch_id"],
            "title": "חדירה",
            "due_at": due_at_iso(),
            "assignee_user_id": second_branch_seed["employee_id"],
        },
    )
    assert forbidden_create.status_code == 403

    forbidden_get = mgr_b.get(f"/api/tasks/occurrences/{occ_id}")
    assert forbidden_get.status_code == 403
