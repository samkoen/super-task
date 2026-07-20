"""Grâce de 15 min avant marquage באיחור."""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.domain.employee_task_carry_over import status_after_rollover
from app.domain import task_status
from app.domain.task_overdue import OVERDUE_GRACE_MINUTES, is_past_due, overdue_cutoff

TZ = ZoneInfo("Asia/Jerusalem")


def test_not_past_due_within_grace_window():
    now = datetime(2026, 7, 20, 12, 0, tzinfo=TZ)
    due = now - timedelta(minutes=5)
    assert is_past_due(due, now) is False


def test_past_due_after_grace_window():
    now = datetime(2026, 7, 20, 12, 0, tzinfo=TZ)
    due = now - timedelta(minutes=OVERDUE_GRACE_MINUTES + 1)
    assert is_past_due(due, now) is True


def test_overdue_cutoff_is_now_minus_grace():
    now = datetime(2026, 7, 20, 12, 0, tzinfo=TZ)
    assert overdue_cutoff(now) == now - timedelta(minutes=15)


def test_status_after_rollover_respects_grace():
    now = datetime(2026, 1, 2, 12, 0, tzinfo=TZ)
    almost_due = now - timedelta(minutes=5)
    assert (
        status_after_rollover(task_status.PENDING, new_due_at=almost_due, now=now)
        == task_status.PENDING
    )
