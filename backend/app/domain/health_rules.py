"""Health indicators for branch and department dashboards."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Literal

from app.domain import task_status

HealthLevel = Literal["green", "orange", "red"]

URGENT_WINDOW = timedelta(hours=2)
COMPLETION_ORANGE_THRESHOLD = 0.80


def occurrence_health(*, status: str, due_at: datetime, now: datetime) -> HealthLevel:
    if status == task_status.OVERDUE:
        return "red"
    if status in task_status.TERMINAL:
        return "green"
    if status in task_status.ACTIVE and due_at <= now + URGENT_WINDOW:
        return "orange"
    return "green"


def aggregate_health(levels: list[HealthLevel]) -> HealthLevel:
    if not levels:
        return "green"
    if "red" in levels:
        return "red"
    if "orange" in levels:
        return "orange"
    return "green"


def branch_health_from_counts(
    *,
    overdue: int,
    completion_rate: float,
    urgent_pending: int,
) -> HealthLevel:
    if overdue > 0:
        return "red"
    if completion_rate < COMPLETION_ORANGE_THRESHOLD or urgent_pending > 0:
        return "orange"
    return "green"
