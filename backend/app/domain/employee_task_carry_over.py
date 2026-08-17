"""Report des tâches non terminées : due_at (exécution) avance, opened_on reste.

Uniquement les מזדמנות (ad_hoc). Les קבועות restent sur leur jour d'origine ;
une nouvelle occurrence est générée par le scheduler.
"""
from __future__ import annotations

from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from app.domain import task_status
from app.domain.task_kind import AD_HOC
from app.models.task_occurrence import TaskOccurrence

# Statuts encore ouverts : on avance leur échéance d'exécution au jour courant.
ROLLOVER_STATUSES = frozenset(
    {
        task_status.PENDING,
        task_status.OVERDUE,
        task_status.IN_PROGRESS,
        task_status.AWAITING_RESPONSE,
        task_status.PENDING_REVIEW,
    }
)


def can_rollover_task_kind(task_kind: str | None) -> bool:
    """Seules les tâches מזדמנות se reportent au jour suivant."""
    return (task_kind or "").strip() == AD_HOC


def parse_due_at(value: str | datetime, tz: ZoneInfo) -> datetime:
    if isinstance(value, datetime):
        dt = value
    else:
        dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=tz)
    return dt.astimezone(tz)


def start_of_day(day: date, tz: ZoneInfo) -> datetime:
    return datetime.combine(day, time.min, tzinfo=tz)


def opened_on_from_due(due_at: datetime, tz: ZoneInfo) -> date:
    """À la création : date d'ouverture = jour d'exécution initial."""
    return parse_due_at(due_at, tz).date()


def parse_opened_on(value: str | date | None, *, due_at: str | datetime, tz: ZoneInfo) -> date:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, str) and value.strip():
        return date.fromisoformat(value[:10])
    return opened_on_from_due(due_at if isinstance(due_at, datetime) else parse_due_at(due_at, tz), tz)


def rollover_due_datetime(due_at: datetime, *, to_day: date, tz: ZoneInfo) -> datetime:
    """Garde l'heure, change le jour calendaire d'exécution (fuseau métier)."""
    local = parse_due_at(due_at, tz)
    return local.replace(year=to_day.year, month=to_day.month, day=to_day.day)


def status_after_rollover(status: str, *, new_due_at: datetime, now: datetime) -> str:
    from app.domain.task_overdue import is_past_due

    if status in {task_status.IN_PROGRESS, task_status.AWAITING_RESPONSE, task_status.PENDING_REVIEW}:
        return status
    if is_past_due(new_due_at, now):
        return task_status.OVERDUE
    return task_status.PENDING


def is_carry_over_task(task: TaskOccurrence, *, day: date, tz: ZoneInfo) -> bool:
    """True si מזדמנת encore ouverte et échéance d'exécution avant le jour affiché."""
    if not can_rollover_task_kind(getattr(task, "task_kind", None)):
        return False
    if task.status not in ROLLOVER_STATUSES:
        return False
    return parse_due_at(task.due_at, tz).date() < day


def has_rolled_execution(task: TaskOccurrence, *, tz: ZoneInfo) -> bool:
    """True si la date d'exécution a avancé par rapport à l'ouverture."""
    opened = parse_opened_on(getattr(task, "opened_on", None), due_at=task.due_at, tz=tz)
    return opened < parse_due_at(task.due_at, tz).date()


def select_carry_over_tasks(
    tasks: list[TaskOccurrence],
    *,
    day: date,
    tz: ZoneInfo,
) -> list[TaskOccurrence]:
    selected = [t for t in tasks if is_carry_over_task(t, day=day, tz=tz)]
    return sorted(selected, key=lambda t: t.due_at)
