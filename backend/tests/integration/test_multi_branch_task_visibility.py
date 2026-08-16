"""Intégration multi-snif : tâche menahel snif B visible oved seulement si snif actif = B."""
from __future__ import annotations

import app.db.session as db_session
from tests.integration.conftest import (
    EMP_EMAIL,
    MGR_B_EMAIL,
    due_at_iso,
    login_client,
)
from app.repositories.user_branch_membership_repository import UserBranchMembershipRepository


def _employee_task_ids(payload: dict) -> set[str]:
    keys = (
        "urgent_tasks",
        "today_tasks",
        "in_progress_tasks",
        "awaiting_response_tasks",
        "pending_review_tasks",
        "completed_tasks",
    )
    ids: set[str] = set()
    for key in keys:
        for task in payload.get(key) or []:
            ids.add(task["id"])
    return ids


def _set_active_branch(client, branch_id: str) -> None:
    response = client.post("/api/auth/active-branch", json={"branch_id": branch_id})
    assert response.status_code == 200, response.text
    assert response.json()["user"]["active_branch_id"] == branch_id


def test_menahel_task_on_branch_b_visible_only_when_oved_active_is_b(
    app, second_branch_seed
):
    branch_a = second_branch_seed["branch_id"]
    branch_b = second_branch_seed["branch_b_id"]
    employee_id = second_branch_seed["employee_id"]

    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        UserBranchMembershipRepository(db).ensure_membership(
            employee_id, branch_b, is_primary=False
        )
        db.commit()
    finally:
        db.close()

    mgr_b = login_client(app, MGR_B_EMAIL)
    created = mgr_b.post(
        "/api/tasks/ad-hoc",
        json={
            "branch_id": branch_b,
            "title": "משימה בסניף ב",
            "description": "",
            "due_at": due_at_iso(),
            "assignee_user_id": employee_id,
            "photo_required": False,
        },
    )
    assert created.status_code == 201, created.text
    occ_id = created.json()["occurrence"]["id"]
    assert created.json()["occurrence"]["branch_id"] == branch_b

    emp = login_client(app, EMP_EMAIL)

    _set_active_branch(emp, branch_b)
    dash_b = emp.get("/api/dashboard/employee")
    assert dash_b.status_code == 200, dash_b.text
    assert occ_id in _employee_task_ids(dash_b.json())

    _set_active_branch(emp, branch_a)
    dash_a = emp.get("/api/dashboard/employee")
    assert dash_a.status_code == 200, dash_a.text
    assert occ_id not in _employee_task_ids(dash_a.json())
