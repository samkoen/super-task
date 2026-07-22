"""Timeline et files de tâches pour le dashboard manager."""
from __future__ import annotations

from datetime import date, datetime

from app.domain import task_status
from app.models.task_completion import TaskCompletion
from app.models.task_occurrence import TaskOccurrence

TimelineSegment = str  # completed | in_progress | pending_review | awaiting_response | upcoming | overdue


def parse_dt(value: str, tz) -> datetime:
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=tz)
    return dt


def _due_day(task: TaskOccurrence, tz) -> date:
    return parse_dt(task.due_at, tz).date()


def duration_minutes(start: datetime, end: datetime) -> int:
    return max(0, int((end - start).total_seconds() // 60))


def timeline_segment(task: TaskOccurrence, *, now: datetime, tz) -> TimelineSegment:
    if task.status == task_status.COMPLETED:
        return "completed"
    if task.status == task_status.PENDING_REVIEW:
        return "pending_review"
    if task.status == task_status.AWAITING_RESPONSE:
        return "awaiting_response"
    if task.status == task_status.IN_PROGRESS:
        return "in_progress"
    if task.status == task_status.OVERDUE:
        return "overdue"
    due = parse_dt(task.due_at, tz)
    if task.status == task_status.PENDING and due > now:
        return "upcoming"
    return "upcoming"


def build_timeline_item(
    task: TaskOccurrence,
    *,
    now: datetime,
    tz,
    completion: TaskCompletion | None,
    department_name: str | None,
    assignee_name: str | None,
) -> dict:
    segment = timeline_segment(task, now=now, tz=tz)
    started_at = task.started_at
    completed_at = completion.completed_at if completion else None
    duration: int | None = None
    elapsed: int | None = None
    if started_at and completed_at and task.status == task_status.COMPLETED:
        duration = duration_minutes(parse_dt(started_at, tz), parse_dt(completed_at, tz))
    elif started_at and completed_at and task.status == task_status.PENDING_REVIEW:
        duration = duration_minutes(parse_dt(started_at, tz), parse_dt(completed_at, tz))
    elif started_at and task.status == task_status.IN_PROGRESS:
        elapsed = duration_minutes(parse_dt(started_at, tz), now)
    return {
        "id": task.id,
        "title": task.title,
        "status": task.status,
        "segment": segment,
        "due_at": task.due_at,
        "started_at": started_at,
        "completed_at": completed_at,
        "duration_minutes": duration,
        "elapsed_minutes": elapsed,
        "department_name": department_name,
        "assignee_name": assignee_name,
        "task_kind": task.task_kind,
        "manager_next_at": task.manager_next_at,
        "is_manager_next": bool(task.manager_next_at),
    }


def sort_timeline_tasks(tasks: list[TaskOccurrence], tz) -> list[TaskOccurrence]:
    def key(task: TaskOccurrence) -> tuple:
        if task.status in {
            task_status.IN_PROGRESS,
            task_status.PENDING_REVIEW,
            task_status.AWAITING_RESPONSE,
        }:
            return (0, task.started_at or task.due_at)
        if task.status == task_status.COMPLETED:
            return (1, task.started_at or task.due_at)
        return (2, task.due_at)

    return sorted(tasks, key=key)


def task_queue_bucket(status: str) -> str | None:
    """File dashboard : completed | in_progress | pending_review | upcoming | None."""
    if status == task_status.CANCELLED:
        return None
    if status == task_status.COMPLETED:
        return "completed"
    if status in {task_status.PENDING_REVIEW, task_status.AWAITING_RESPONSE}:
        return "pending_review"
    if status == task_status.IN_PROGRESS:
        return "in_progress"
    if status in {task_status.PENDING, task_status.OVERDUE}:
        return "upcoming"
    return None


def overdue_days(task: TaskOccurrence, *, day: date, tz) -> int:
    return max(0, (day - _due_day(task, tz)).days)


def build_unfinished_item(
    task: TaskOccurrence,
    *,
    day: date,
    tz,
    department_name: str | None,
    assignee_name: str | None,
    pending_delegation: bool,
) -> dict:
    return {
        "occurrence_id": task.id,
        "title": task.title,
        "status": task.status,
        "due_at": task.due_at,
        "overdue_days": overdue_days(task, day=day, tz=tz),
        "department_name": department_name,
        "assignee_name": assignee_name,
        "pending_delegation": pending_delegation,
        "task_kind": task.task_kind,
    }
