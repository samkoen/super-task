"""Report des tâches employé non terminées au jour suivant (due_at avance)."""
from __future__ import annotations

from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from app.domain import task_status
from app.models.task_occurrence import TaskOccurrence

# Statuts encore ouverts : on avance leur échéance au jour calendaire courant.
ROLLOVER_STATUSES = frozenset(
    {
        task_status.PENDING,
        task_status.OVERDUE,
        task_status.IN_PROGRESS,
    }
)


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


def rollover_due_datetime(due_at: datetime, *, to_day: date, tz: ZoneInfo) -> datetime:
    """Garde l'heure, change le jour calendaire (fuseau métier)."""
    local = parse_due_at(due_at, tz)
    return local.replace(year=to_day.year, month=to_day.month, day=to_day.day)


def status_after_rollover(status: str, *, new_due_at: datetime, now: datetime) -> str:
    from app.domain.task_overdue import is_past_due

    if status == task_status.IN_PROGRESS:
        return task_status.IN_PROGRESS
    if is_past_due(new_due_at, now):
        return task_status.OVERDUE
    return task_status.PENDING


def is_carry_over_task(task: TaskOccurrence, *, day: date, tz: ZoneInfo) -> bool:
    """True si encore ouverte et échéance avant le jour affiché (avant rollover)."""
    if task.status not in ROLLOVER_STATUSES:
        return False
    return parse_due_at(task.due_at, tz).date() < day


def select_carry_over_tasks(
    tasks: list[TaskOccurrence],
    *,
    day: date,
    tz: ZoneInfo,
) -> list[TaskOccurrence]:
    selected = [t for t in tasks if is_carry_over_task(t, day=day, tz=tz)]
    return sorted(selected, key=lambda t: t.due_at)
