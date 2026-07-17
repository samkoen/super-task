from datetime import date, datetime
from unittest.mock import MagicMock
from zoneinfo import ZoneInfo

from app.domain import task_status
from app.domain.employee_task_carry_over import (
    is_carry_over_task,
    rollover_due_datetime,
    select_carry_over_tasks,
    status_after_rollover,
)
from app.models.task_occurrence import TaskOccurrence
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository

TZ = ZoneInfo("Asia/Jerusalem")


def _task(**overrides) -> TaskOccurrence:
    base = {
        "id": "occ-1",
        "template_id": None,
        "branch_id": "b1",
        "title": "T",
        "description": "",
        "due_at": "2026-07-16T12:00:00+03:00",
        "status": task_status.PENDING,
        "assignee_user_id": "emp-1",
        "department_id": None,
        "task_kind": "ad_hoc",
        "manager_user_id": None,
        "photo_required": False,
        "reference_photo_url": None,
        "reference_video_url": None,
        "reference_audio_url": None,
        "media_purge_after": None,
        "started_at": None,
        "started_by_id": None,
        "created_by_id": "mgr-1",
        "created_at": "2026-07-16T00:00:00+03:00",
        "updated_at": "2026-07-16T00:00:00+03:00",
    }
    base.update(overrides)
    return TaskOccurrence(**base)


def test_pending_yesterday_is_carry_over_today():
    task = _task(status=task_status.PENDING, due_at="2026-07-16T18:00:00+03:00")
    assert is_carry_over_task(task, day=date(2026, 7, 17), tz=TZ) is True


def test_completed_yesterday_is_not_carry_over():
    task = _task(status=task_status.COMPLETED, due_at="2026-07-16T09:00:00+03:00")
    assert is_carry_over_task(task, day=date(2026, 7, 17), tz=TZ) is False


def test_today_pending_is_not_carry_over():
    task = _task(status=task_status.PENDING, due_at="2026-07-17T09:00:00+03:00")
    assert is_carry_over_task(task, day=date(2026, 7, 17), tz=TZ) is False


def test_select_carry_over_sorted_by_due():
    older = _task(id="a", due_at="2026-07-14T09:00:00+03:00", status=task_status.OVERDUE)
    newer = _task(id="b", due_at="2026-07-16T09:00:00+03:00", status=task_status.PENDING)
    today = _task(id="c", due_at="2026-07-17T09:00:00+03:00", status=task_status.PENDING)
    selected = select_carry_over_tasks([newer, today, older], day=date(2026, 7, 17), tz=TZ)
    assert [t.id for t in selected] == ["a", "b"]


def test_rollover_due_keeps_time_changes_day():
    due = datetime(2026, 1, 1, 15, 30, tzinfo=TZ)
    rolled = rollover_due_datetime(due, to_day=date(2026, 1, 2), tz=TZ)
    assert rolled.date() == date(2026, 1, 2)
    assert rolled.hour == 15
    assert rolled.minute == 30


def test_status_after_rollover_becomes_pending_if_still_in_future():
    now = datetime(2026, 1, 2, 10, 0, tzinfo=TZ)
    new_due = datetime(2026, 1, 2, 18, 0, tzinfo=TZ)
    assert status_after_rollover(task_status.OVERDUE, new_due_at=new_due, now=now) == task_status.PENDING


def test_status_after_rollover_stays_overdue_if_past():
    now = datetime(2026, 1, 2, 20, 0, tzinfo=TZ)
    new_due = datetime(2026, 1, 2, 9, 0, tzinfo=TZ)
    assert status_after_rollover(task_status.PENDING, new_due_at=new_due, now=now) == task_status.OVERDUE


def test_rollover_open_tasks_to_day_updates_due_at():
    row = MagicMock()
    row.status = task_status.OVERDUE
    row.due_at = datetime(2026, 1, 1, 14, 0, tzinfo=TZ)

    db = MagicMock()
    scalars = MagicMock()
    scalars.all.return_value = [row]
    execute_result = MagicMock()
    execute_result.scalars.return_value = scalars
    db.execute.return_value = execute_result

    repo = TaskOccurrenceRepository(db)
    now = datetime(2026, 1, 2, 10, 0, tzinfo=TZ)
    count = repo.rollover_open_tasks_to_day(date(2026, 1, 2), now=now)

    assert count == 1
    assert row.due_at.date() == date(2026, 1, 2)
    assert row.due_at.hour == 14
    assert row.status == task_status.PENDING
    db.flush.assert_called_once()
