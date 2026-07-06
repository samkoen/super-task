from datetime import datetime, timedelta, timezone

from app.domain import task_status
from app.domain.health_rules import (
    aggregate_health,
    branch_health_from_counts,
    occurrence_health,
)


def test_occurrence_health_overdue():
    now = datetime(2026, 7, 6, 12, 0, tzinfo=timezone.utc)
    due = now + timedelta(hours=5)
    assert occurrence_health(status=task_status.OVERDUE, due_at=due, now=now) == "red"


def test_occurrence_health_due_soon():
    now = datetime(2026, 7, 6, 12, 0, tzinfo=timezone.utc)
    due = now + timedelta(hours=1)
    assert occurrence_health(status=task_status.PENDING, due_at=due, now=now) == "orange"


def test_aggregate_health_worst_wins():
    assert aggregate_health(["green", "orange", "green"]) == "orange"
    assert aggregate_health(["green", "red"]) == "red"


def test_branch_health_from_counts():
    assert branch_health_from_counts(overdue=1, completion_rate=1.0, urgent_pending=0) == "red"
    assert branch_health_from_counts(overdue=0, completion_rate=0.5, urgent_pending=0) == "orange"
    assert branch_health_from_counts(overdue=0, completion_rate=0.95, urgent_pending=0) == "green"
