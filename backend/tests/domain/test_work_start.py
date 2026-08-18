"""Tests pointage — tâche is_work_start fermée."""
from app.domain import task_status
from app.domain.work_start import clock_in_at
from types import SimpleNamespace


def _task(**kw):
    base = dict(is_work_start=False, status=task_status.PENDING, started_at=None)
    base.update(kw)
    return SimpleNamespace(**base)


def test_clock_in_fallback_earliest_start():
    tasks = [
        _task(started_at="2026-08-18T09:00:00+03:00", status=task_status.IN_PROGRESS),
        _task(started_at="2026-08-18T08:10:00+03:00", status=task_status.COMPLETED),
    ]
    assert clock_in_at(tasks) == "2026-08-18T08:10:00+03:00"


def test_clock_in_uses_closed_work_start_only():
    tasks = [
        _task(started_at="2026-08-18T07:00:00+03:00", status=task_status.IN_PROGRESS),
        _task(
            is_work_start=True,
            started_at="2026-08-18T08:40:00+03:00",
            status=task_status.COMPLETED,
        ),
    ]
    assert clock_in_at(tasks) == "2026-08-18T08:40:00+03:00"


def test_clock_in_none_until_work_start_closed():
    tasks = [
        _task(
            is_work_start=True,
            started_at="2026-08-18T08:40:00+03:00",
            status=task_status.IN_PROGRESS,
        )
    ]
    assert clock_in_at(tasks) is None
