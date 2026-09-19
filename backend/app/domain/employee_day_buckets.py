"""Découpe des tâches du jour côté oved / menahel (ses propres tâches)."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from app.domain import task_status
from app.domain.employee_task_focus import (
    sort_employee_open_focus,
    sort_in_progress_focus_first,
)

URGENT_EMPLOYEE_WINDOW = timedelta(hours=1)


@dataclass(frozen=True)
class EmployeeDayBuckets:
    urgent: list
    in_progress: list
    awaiting_response: list
    pending_review: list
    today_open: list
    completed: list


def parse_task_due_at(value: str, tz) -> datetime:
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=tz)
    return dt


def is_employee_urgent(task, *, now: datetime, tz, window: timedelta) -> bool:
    due = parse_task_due_at(task.due_at, tz)
    return (
        task.status == task_status.OVERDUE
        or task.task_kind == "ad_hoc"
        or bool(task.manager_next_at)
        or (task.status == task_status.PENDING and due <= now + window)
    )


def split_employee_day_tasks(
    tasks: list,
    *,
    now: datetime,
    tz,
    urgent_window: timedelta = URGENT_EMPLOYEE_WINDOW,
) -> EmployeeDayBuckets:
    in_progress = sort_in_progress_focus_first(
        [t for t in tasks if t.status == task_status.IN_PROGRESS]
    )
    awaiting_response = [t for t in tasks if t.status == task_status.AWAITING_RESPONSE]
    pending_review = [t for t in tasks if t.status == task_status.PENDING_REVIEW]
    completed = [t for t in tasks if t.status == task_status.COMPLETED]
    has_in_progress = len(in_progress) > 0
    urgent, seen = _urgent_open_tasks(
        tasks, now=now, tz=tz, window=urgent_window, has_in_progress=has_in_progress
    )
    today_open = sort_employee_open_focus(
        [
            t
            for t in tasks
            if t.status in {task_status.PENDING, task_status.OVERDUE} and t.id not in seen
        ],
        has_in_progress=has_in_progress,
    )
    return EmployeeDayBuckets(
        urgent=urgent,
        in_progress=in_progress,
        awaiting_response=awaiting_response,
        pending_review=pending_review,
        today_open=today_open,
        completed=completed,
    )


def _urgent_open_tasks(tasks, *, now, tz, window, has_in_progress) -> tuple[list, set[str]]:
    urgent: list = []
    seen: set[str] = set()
    candidates = sort_employee_open_focus(
        [t for t in tasks if t.status in {task_status.OVERDUE, task_status.PENDING}],
        has_in_progress=has_in_progress,
    )
    for task in candidates:
        if task.id in seen:
            continue
        if is_employee_urgent(task, now=now, tz=tz, window=window):
            urgent.append(task)
            seen.add(task.id)
    return urgent, seen
