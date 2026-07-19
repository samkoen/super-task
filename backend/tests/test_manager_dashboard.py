"""Tests règles timeline dashboard manager."""
from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.domain import task_status
from app.domain.manager_dashboard import (
    build_timeline_item,
    build_unfinished_item,
    duration_minutes,
    sort_timeline_tasks,
    task_queue_bucket,
    timeline_segment,
)
from app.models.task_completion import TaskCompletion
from app.models.task_occurrence import TaskOccurrence

TZ = ZoneInfo("Asia/Jerusalem")
NOW = datetime(2026, 7, 14, 12, 0, tzinfo=TZ)
DAY = date(2026, 7, 14)


def _task(**kwargs) -> TaskOccurrence:
    defaults = {
        "id": "t1",
        "template_id": None,
        "branch_id": "b1",
        "title": "ניקוי",
        "description": "",
        "due_at": "2026-07-14T10:00:00+03:00",
        "status": task_status.PENDING,
        "assignee_user_id": "u1",
        "department_id": None,
        "task_kind": "fixed",
        "manager_user_id": None,
        "photo_required": False,
        "reference_photo_url": None,
        "reference_video_url": None,
        "reference_audio_url": None,
        "media_purge_after": None,
        "started_at": None,
        "started_by_id": None,
        "created_by_id": None,
        "created_at": "2026-07-14T08:00:00+03:00",
        "updated_at": "2026-07-14T08:00:00+03:00",
    }
    defaults.update(kwargs)
    return TaskOccurrence(**defaults)


def test_timeline_segment_completed_and_in_progress():
    assert timeline_segment(_task(status=task_status.COMPLETED), now=NOW, tz=TZ) == "completed"
    assert timeline_segment(_task(status=task_status.IN_PROGRESS), now=NOW, tz=TZ) == "in_progress"
    assert timeline_segment(_task(status=task_status.PENDING_REVIEW), now=NOW, tz=TZ) == "pending_review"
    assert timeline_segment(_task(status=task_status.OVERDUE), now=NOW, tz=TZ) == "overdue"


def test_timeline_segment_upcoming_when_due_later():
    task = _task(status=task_status.PENDING, due_at="2026-07-14T15:00:00+03:00")
    assert timeline_segment(task, now=NOW, tz=TZ) == "upcoming"


def test_build_timeline_item_duration():
    task = _task(
        status=task_status.COMPLETED,
        started_at="2026-07-14T09:00:00+03:00",
    )
    completion = TaskCompletion(
        id="c1",
        occurrence_id="t1",
        status="done",
        note=None,
        photo_path=None,
        video_path=None,
        audio_path=None,
        not_completed_reason=None,
        completed_by_id="u1",
        completed_at="2026-07-14T09:45:00+03:00",
    )
    item = build_timeline_item(
        task,
        now=NOW,
        tz=TZ,
        completion=completion,
        department_name="ירקות",
        assignee_name="יוסי",
    )
    assert item["duration_minutes"] == 45
    assert item["segment"] == "completed"


def test_build_timeline_item_elapsed_for_in_progress():
    task = _task(
        status=task_status.IN_PROGRESS,
        started_at="2026-07-14T11:30:00+03:00",
    )
    item = build_timeline_item(
        task,
        now=NOW,
        tz=TZ,
        completion=None,
        department_name=None,
        assignee_name="יוסי",
    )
    assert item["elapsed_minutes"] == 30
    assert item["segment"] == "in_progress"


def test_sort_timeline_in_progress_first():
    tasks = [
        _task(id="a", status=task_status.PENDING, due_at="2026-07-14T08:00:00+03:00"),
        _task(id="b", status=task_status.IN_PROGRESS, started_at="2026-07-14T09:00:00+03:00"),
        _task(id="c", status=task_status.COMPLETED, started_at="2026-07-14T07:00:00+03:00"),
    ]
    ordered = sort_timeline_tasks(tasks, TZ)
    assert [t.id for t in ordered] == ["b", "c", "a"]


def test_build_unfinished_overdue_days():
    task = _task(status=task_status.OVERDUE, due_at="2026-07-12T08:00:00+03:00")
    item = build_unfinished_item(
        task,
        day=DAY,
        tz=TZ,
        department_name="קופות",
        assignee_name="דוד",
        pending_delegation=False,
    )
    assert item["overdue_days"] == 2


def test_duration_minutes_non_negative():
    start = datetime(2026, 7, 14, 10, 0, tzinfo=TZ)
    end = datetime(2026, 7, 14, 9, 0, tzinfo=TZ)
    assert duration_minutes(start, end) == 0


def test_task_queue_bucket_includes_pending_and_overdue_before_start():
    assert task_queue_bucket(task_status.PENDING) == "upcoming"
    assert task_queue_bucket(task_status.OVERDUE) == "upcoming"
    assert task_queue_bucket(task_status.IN_PROGRESS) == "in_progress"
    assert task_queue_bucket(task_status.CANCELLED) is None


def test_build_timeline_item_overdue_before_start():
    task = _task(status=task_status.OVERDUE, due_at="2026-07-14T10:05:00+03:00", started_at=None)
    item = build_timeline_item(
        task,
        now=NOW,
        tz=TZ,
        completion=None,
        department_name=None,
        assignee_name="יוסי",
    )
    assert item["segment"] == "overdue"
    assert item["started_at"] is None
