"""Tests pointage — tâche is_work_start fermée."""
from datetime import datetime
from zoneinfo import ZoneInfo

from app.domain import task_status
from app.domain.work_start import (
    arrival_at_from_visual,
    clock_in_at,
    employee_on_shift,
    first_visual_captured_at,
    normalize_work_flags,
)
import pytest
from types import SimpleNamespace

TZ = ZoneInfo("Asia/Jerusalem")


def _task(**kw):
    base = dict(is_work_start=False, status=task_status.PENDING, started_at=None)
    base.update(kw)
    return SimpleNamespace(**base)


def test_normalize_rejects_both_flags():
    with pytest.raises(ValueError):
        normalize_work_flags(True, True)


def test_normalize_work_flags_ok():
    assert normalize_work_flags(True, False) == (True, False)
    assert normalize_work_flags(False, True) == (False, True)


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


def test_on_shift_after_open_punch_before_any_task_starts():
    tasks = [
        _task(is_work_start=True, status=task_status.PENDING_REVIEW),
        _task(status=task_status.PENDING),
        _task(is_work_end=True, status=task_status.PENDING),
    ]
    assert employee_on_shift(tasks, active_work=False) is True


def test_on_shift_false_until_open_punch_closed():
    tasks = [
        _task(is_work_start=True, status=task_status.PENDING),
        _task(status=task_status.IN_PROGRESS),
    ]
    assert employee_on_shift(tasks, active_work=True) is False


def test_on_shift_false_after_close_punch():
    tasks = [
        _task(is_work_start=True, status=task_status.COMPLETED),
        _task(is_work_end=True, status=task_status.COMPLETED),
        _task(status=task_status.IN_PROGRESS),
    ]
    assert employee_on_shift(tasks, active_work=True) is False


def test_on_shift_without_punch_follows_active_work():
    idle = [_task(status=task_status.PENDING)]
    busy = [_task(status=task_status.IN_PROGRESS)]
    assert employee_on_shift(idle, active_work=False) is False
    assert employee_on_shift(busy, active_work=True) is True


def test_clock_in_none_until_work_start_closed():
    tasks = [
        _task(
            is_work_start=True,
            started_at="2026-08-18T08:40:00+03:00",
            status=task_status.IN_PROGRESS,
        )
    ]
    assert clock_in_at(tasks) is None


def test_first_visual_uses_earliest_photo_or_video():
    attachments = [
        {"kind": "audio", "url": "/a.webm", "captured_at": "2026-08-18T08:00:00+03:00"},
        {"kind": "video", "url": "/v.mp4", "captured_at": "2026-08-18T08:12:00+03:00"},
        {"kind": "photo", "url": "/p.jpg", "captured_at": "2026-08-18T08:05:00+03:00"},
    ]
    assert first_visual_captured_at(attachments) == "2026-08-18T08:05:00+03:00"


def test_first_visual_ignores_empty_or_invalid():
    assert first_visual_captured_at(
        [
            {"kind": "photo", "url": "", "captured_at": "2026-08-18T08:05:00+03:00"},
            {"kind": "photo", "url": "/p.jpg", "captured_at": "not-a-date"},
            {"kind": "photo", "url": "/p2.jpg"},
        ]
    ) is None


def test_arrival_from_visual_clamps_future():
    now = datetime(2026, 8, 18, 8, 10, tzinfo=TZ)
    when = arrival_at_from_visual(
        [{"kind": "photo", "url": "/p.jpg", "captured_at": "2026-08-18T09:00:00+03:00"}],
        now=now,
    )
    assert when == now
