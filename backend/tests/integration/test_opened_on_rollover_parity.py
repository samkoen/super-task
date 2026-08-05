"""Intégration : opened_on immuable, due_at avance, oved et menahel voient la même chose."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import app.db.session as db_session
from app.domain import task_status
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from tests.integration.conftest import due_at_iso

TZ = ZoneInfo("Asia/Jerusalem")


def _today() -> date:
    return datetime.now(TZ).date()


def _yesterday() -> date:
    return _today() - timedelta(days=1)


def _at_day(day: date, hour: int = 14) -> datetime:
    return datetime.combine(day, time(hour=hour, minute=0), tzinfo=TZ)


def _create_ad_hoc_api(client_mgr, world_seed, *, title: str, due_at: str) -> dict:
    response = client_mgr.post(
        "/api/tasks/ad-hoc",
        json={
            "branch_id": world_seed["branch_id"],
            "title": title,
            "description": "",
            "due_at": due_at,
            "assignee_user_id": world_seed["employee_id"],
            "photo_required": False,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["occurrence"]


def _seed_open_occurrence(
    world_seed,
    *,
    title: str,
    due_day: date,
    status: str = task_status.PENDING,
) -> str:
    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        occ = TaskOccurrenceRepository(db).create(
            template_id=None,
            branch_id=world_seed["branch_id"],
            title=title,
            description="",
            due_at=_at_day(due_day),
            assignee_user_id=world_seed["employee_id"],
            department_id=None,
            status=status,
            task_kind="ad_hoc",
            manager_user_id=world_seed["manager_id"],
            created_by_id=world_seed["manager_id"],
            photo_required=False,
        )
        db.commit()
        return occ.id
    finally:
        db.close()


def _get_occurrence(client, occ_id: str) -> dict:
    response = client.get(f"/api/tasks/occurrences/{occ_id}")
    assert response.status_code == 200, response.text
    return response.json()


def _due_day(iso: str) -> date:
    return datetime.fromisoformat(iso).astimezone(TZ).date()


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


def _manager_queue_ids(payload: dict) -> set[str]:
    queues = payload.get("task_queues") or {}
    ids: set[str] = set()
    for bucket in queues.values():
        for task in bucket or []:
            ids.add(task["id"])
    return ids


def test_create_sets_opened_on_equal_to_due_day(client_mgr, world_seed):
    due = due_at_iso(3)
    occ = _create_ad_hoc_api(client_mgr, world_seed, title="AAA", due_at=due)
    expected_day = _due_day(due).isoformat()
    assert occ.get("opened_on") == expected_day
    assert _due_day(occ["due_at"]).isoformat() == expected_day


def test_rollover_advances_due_at_keeps_opened_on(client_mgr, world_seed):
    yday = _yesterday()
    today = _today()
    occ_id = _seed_open_occurrence(
        world_seed,
        title="לסדר את הכניסה",
        due_day=yday,
        status=task_status.PENDING,
    )

    dash = client_mgr.get(
        "/api/dashboard/manager",
        params={"branch_id": world_seed["branch_id"], "due_on": today.isoformat()},
    )
    assert dash.status_code == 200, dash.text

    occ = _get_occurrence(client_mgr, occ_id)
    assert occ["opened_on"] == yday.isoformat()
    assert _due_day(occ["due_at"]) == today
    assert occ["status"] in {task_status.PENDING, task_status.OVERDUE}


def test_rollover_keeps_awaiting_response_status(client_mgr, world_seed):
    yday = _yesterday()
    today = _today()
    occ_id = _seed_open_occurrence(
        world_seed,
        title="שאלה פתוחה",
        due_day=yday,
        status=task_status.AWAITING_RESPONSE,
    )

    assert (
        client_mgr.get(
            "/api/dashboard/manager",
            params={"branch_id": world_seed["branch_id"], "due_on": today.isoformat()},
        ).status_code
        == 200
    )

    occ = _get_occurrence(client_mgr, occ_id)
    assert occ["opened_on"] == yday.isoformat()
    assert _due_day(occ["due_at"]) == today
    assert occ["status"] == task_status.AWAITING_RESPONSE


def test_oved_and_menahel_see_same_rolled_task(client_mgr, client_emp, world_seed):
    yday = _yesterday()
    today = _today()
    rolled_id = _seed_open_occurrence(
        world_seed,
        title="לסדר את הכניסה",
        due_day=yday,
        status=task_status.PENDING,
    )
    today_id = _seed_open_occurrence(
        world_seed,
        title="AAA",
        due_day=today,
        status=task_status.PENDING,
    )

    mgr = client_mgr.get(
        "/api/dashboard/manager",
        params={"branch_id": world_seed["branch_id"], "due_on": today.isoformat()},
    )
    assert mgr.status_code == 200, mgr.text
    emp = client_emp.get("/api/dashboard/employee", params={"due_on": today.isoformat()})
    assert emp.status_code == 200, emp.text

    mgr_ids = _manager_queue_ids(mgr.json())
    emp_ids = _employee_task_ids(emp.json())

    assert {rolled_id, today_id}.issubset(mgr_ids)
    assert {rolled_id, today_id}.issubset(emp_ids)
    assert {rolled_id, today_id}.issubset(mgr_ids & emp_ids)


def test_future_task_not_in_today_for_either_role(client_mgr, client_emp, world_seed):
    tomorrow = _today() + timedelta(days=1)
    today = _today()
    future_id = _seed_open_occurrence(
        world_seed,
        title="מחר בלבד",
        due_day=tomorrow,
        status=task_status.PENDING,
    )

    mgr = client_mgr.get(
        "/api/dashboard/manager",
        params={"branch_id": world_seed["branch_id"], "due_on": today.isoformat()},
    )
    emp = client_emp.get("/api/dashboard/employee", params={"due_on": today.isoformat()})
    assert mgr.status_code == 200
    assert emp.status_code == 200

    assert future_id not in _manager_queue_ids(mgr.json())
    assert future_id not in _employee_task_ids(emp.json())
