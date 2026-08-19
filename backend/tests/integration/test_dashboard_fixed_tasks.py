"""Intégration : le dashboard menahel affiche les קבועות comme l'oved."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import app.db.session as db_session
from app.domain import task_status
from app.domain.fixed_task_expiry import SYSTEM_NOT_COMPLETED_REASON
from app.repositories.task_completion_repository import TaskCompletionRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.task_template_repository import TaskTemplateRepository

TZ = ZoneInfo("Asia/Jerusalem")


def _today() -> date:
    return datetime.now(TZ).date()


def _yesterday() -> date:
    return _today() - timedelta(days=1)


def _at_day(day: date, hour: int = 23, minute: int = 59) -> datetime:
    return datetime.combine(day, time(hour=hour, minute=minute), tzinfo=TZ)


def _seed_fixed_occurrence(world_seed, *, title: str, due_day: date, status: str) -> str:
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
            task_kind="fixed",
            manager_user_id=world_seed["manager_id"],
            created_by_id=world_seed["manager_id"],
            photo_required=False,
        )
        db.commit()
        return occ.id
    finally:
        db.close()


def _seed_fixed_template_without_occurrence(world_seed, *, title: str) -> str:
    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        tpl = TaskTemplateRepository(db).create(
            branch_id=world_seed["branch_id"],
            title=title,
            description="",
            recurrence="daily",
            due_time="23:59",
            weekly_days=None,
            monthly_day=None,
            assignee_user_id=world_seed["employee_id"],
            department_id=None,
            created_by_id=world_seed["manager_id"],
            task_kind="fixed",
        )
        db.commit()
        return tpl.id
    finally:
        db.close()


def _manager_queue_ids(payload: dict) -> set[str]:
    queues = payload.get("task_queues") or {}
    ids: set[str] = set()
    for bucket in queues.values():
        for task in bucket or []:
            ids.add(task["id"])
    return ids


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


def test_manager_dashboard_hides_yesterdays_open_fixed(
    client_mgr, client_emp, world_seed
):
    occ_id = _seed_fixed_occurrence(
        world_seed,
        title="ניקיון קבוע",
        due_day=_yesterday(),
        status=task_status.PENDING,
    )
    today = _today().isoformat()
    mgr = client_mgr.get(
        "/api/dashboard/manager",
        params={"branch_id": world_seed["branch_id"], "due_on": today},
    )
    emp = client_emp.get("/api/dashboard/employee", params={"due_on": today})
    assert mgr.status_code == 200, mgr.text
    assert emp.status_code == 200, emp.text
    assert occ_id not in _manager_queue_ids(mgr.json())
    assert occ_id not in _employee_task_ids(emp.json())

    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        occ = TaskOccurrenceRepository(db).find_by_id(occ_id)
        assert occ is not None
        assert occ.status == task_status.CANCELLED
        completion = TaskCompletionRepository(db).find_by_occurrence(occ_id)
        assert completion is not None
        assert completion.status == task_status.COMPLETION_NOT_DONE
        assert completion.not_completed_reason == SYSTEM_NOT_COMPLETED_REASON
    finally:
        db.close()


def test_manager_dashboard_generates_todays_fixed_from_template(
    client_mgr, client_emp, world_seed
):
    title = "פתיחת סניף"
    tpl_id = _seed_fixed_template_without_occurrence(world_seed, title=title)
    today = _today().isoformat()
    mgr = client_mgr.get(
        "/api/dashboard/manager",
        params={"branch_id": world_seed["branch_id"], "due_on": today},
    )
    emp = client_emp.get("/api/dashboard/employee", params={"due_on": today})
    assert mgr.status_code == 200, mgr.text
    assert emp.status_code == 200, emp.text

    mgr_ids = _manager_queue_ids(mgr.json())
    emp_ids = _employee_task_ids(emp.json())
    mgr_titles = [
        t["title"]
        for bucket in (mgr.json().get("task_queues") or {}).values()
        for t in bucket or []
    ]
    assert title in mgr_titles

    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        assert TaskOccurrenceRepository(db).exists_for_template_on_date(tpl_id, _today())
        occs = TaskOccurrenceRepository(db).list_occurrences(
            branch_id=world_seed["branch_id"], due_on=_today()
        )
        generated_ids = {o.id for o in occs if o.template_id == tpl_id}
    finally:
        db.close()
    assert generated_ids
    assert generated_ids <= mgr_ids
    assert generated_ids <= emp_ids


def test_pending_review_yesterday_is_not_auto_closed(client_mgr, client_emp, world_seed):
    occ_id = _seed_fixed_occurrence(
        world_seed,
        title="ממתינה לאישור",
        due_day=_yesterday(),
        status=task_status.PENDING_REVIEW,
    )
    today = _today().isoformat()
    mgr = client_mgr.get(
        "/api/dashboard/manager",
        params={"branch_id": world_seed["branch_id"], "due_on": today},
    )
    emp = client_emp.get("/api/dashboard/employee", params={"due_on": today})
    assert mgr.status_code == 200
    assert emp.status_code == 200
    assert occ_id not in _manager_queue_ids(mgr.json())
    assert occ_id not in _employee_task_ids(emp.json())

    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        occ = TaskOccurrenceRepository(db).find_by_id(occ_id)
        assert occ is not None
        assert occ.status == task_status.PENDING_REVIEW
        assert TaskCompletionRepository(db).find_by_occurrence(occ_id) is None
    finally:
        db.close()


def test_report_keeps_yesterdays_auto_closed_fixed(client_mgr, world_seed):
    occ_id = _seed_fixed_occurrence(
        world_seed,
        title="לא בוצע אתמול",
        due_day=_yesterday(),
        status=task_status.PENDING,
    )
    dash = client_mgr.get(
        "/api/dashboard/manager",
        params={"branch_id": world_seed["branch_id"], "due_on": _today().isoformat()},
    )
    assert dash.status_code == 200, dash.text
    assert occ_id not in _manager_queue_ids(dash.json())

    report = client_mgr.get(
        "/api/reports/employees",
        params={"branch_id": world_seed["branch_id"], "period": "7d"},
    )
    assert report.status_code == 200, report.text
    row = next(
        (r for r in report.json()["employees"] if r["user_id"] == world_seed["employee_id"]),
        None,
    )
    assert row is not None
    assert row["assigned_count"] >= 1
    assert row["completed_count"] < row["assigned_count"]
