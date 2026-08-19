"""Fermeture auto des קבועות non faites une fois le jour passé."""
from __future__ import annotations

from datetime import date
from zoneinfo import ZoneInfo

from app.domain import task_status
from app.domain.employee_task_carry_over import parse_due_at
from app.domain.task_kind import FIXED
from app.models.task_completion import TaskCompletion
from app.models.task_occurrence import TaskOccurrence

SYSTEM_NOT_COMPLETED_REASON = "נסגר אוטומטית — לא בוצע ביום היעד"

EXPIRE_STATUSES = frozenset(
    {
        task_status.PENDING,
        task_status.OVERDUE,
        task_status.IN_PROGRESS,
        task_status.AWAITING_RESPONSE,
    }
)


def should_expire_open_fixed(task: TaskOccurrence, *, day: date, tz: ZoneInfo) -> bool:
    if (task.task_kind or "").strip() != FIXED:
        return False
    if task.status not in EXPIRE_STATUSES:
        return False
    return parse_due_at(task.due_at, tz).date() < day


def is_system_auto_closed(completion: TaskCompletion | None) -> bool:
    if completion is None:
        return False
    if completion.status != task_status.COMPLETION_NOT_DONE:
        return False
    reason = (completion.not_completed_reason or "").strip()
    return reason == SYSTEM_NOT_COMPLETED_REASON


def counts_in_work_report(task: TaskOccurrence, completion: TaskCompletion | None) -> bool:
    """Les קבועות auto-fermées restent dans les דוחות (oved n'a pas fait)."""
    if task.status != task_status.CANCELLED:
        return True
    return is_system_auto_closed(completion)
