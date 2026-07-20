from datetime import datetime
from zoneinfo import ZoneInfo

from app.domain.employee_inactivity import (
    REASON_HAS_TASKS,
    REASON_NO_TASKS,
    REASON_ON_BREAK,
    idle_reason,
    idle_threshold_reached,
    should_evaluate_idle,
)

TZ = ZoneInfo("Asia/Jerusalem")


def test_no_idle_before_first_start_today():
    now = datetime(2026, 7, 20, 10, 0, tzinfo=TZ)
    assert (
        should_evaluate_idle(
            now=now,
            has_started_task_today=False,
            has_in_progress=False,
            already_notified_episode=False,
        )
        is False
    )


def test_idle_after_first_start_when_not_in_progress():
    now = datetime(2026, 7, 20, 10, 0, tzinfo=TZ)
    assert (
        should_evaluate_idle(
            now=now,
            has_started_task_today=True,
            has_in_progress=False,
            already_notified_episode=False,
        )
        is True
    )


def test_outside_work_window():
    now = datetime(2026, 7, 20, 23, 0, tzinfo=TZ)
    assert (
        should_evaluate_idle(
            now=now,
            has_started_task_today=True,
            has_in_progress=False,
            already_notified_episode=False,
        )
        is False
    )


def test_reasons():
    assert idle_reason(on_break=True, open_task_count=3) == REASON_ON_BREAK
    assert idle_reason(on_break=False, open_task_count=0) == REASON_NO_TASKS
    assert idle_reason(on_break=False, open_task_count=2) == REASON_HAS_TASKS


def test_threshold_30_minutes():
    start = datetime(2026, 7, 20, 10, 0, tzinfo=TZ)
    assert idle_threshold_reached(start, datetime(2026, 7, 20, 10, 29, tzinfo=TZ)) is False
    assert idle_threshold_reached(start, datetime(2026, 7, 20, 10, 30, tzinfo=TZ)) is True
