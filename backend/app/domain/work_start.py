"""Pointage : tâche קבועה marquée « début de travail »."""
from __future__ import annotations

from app.domain import task_status

CLOCK_IN_STATUSES = frozenset({task_status.COMPLETED, task_status.PENDING_REVIEW})


def _earliest_started(tasks: list) -> str | None:
    earliest: str | None = None
    for task in tasks:
        started = getattr(task, "started_at", None)
        if not started:
            continue
        if earliest is None or started < earliest:
            earliest = started
    return earliest


def normalize_work_flags(is_work_start: bool, is_work_end: bool) -> tuple[bool, bool]:
    """Une même tâche ne peut pas être à la fois ouverture et clôture de משמרת."""
    start, end = bool(is_work_start), bool(is_work_end)
    if start and end:
        raise ValueError("משימת פתיחה וסיום לא יכולות להיות אותה משימה")
    return start, end


def clock_in_at(tasks: list, *, fallback_any_start: bool = True) -> str | None:
    """Heure d'arrivée = started_at de la tâche pointage, si elle est aussi fermée.

    Sans tâche is_work_start : fallback historique (plus tôt started_at).
    """
    flagged = [t for t in tasks if getattr(t, "is_work_start", False)]
    if flagged:
        closed = [
            t
            for t in flagged
            if getattr(t, "status", None) in CLOCK_IN_STATUSES
        ]
        return _earliest_started(closed)
    if not fallback_any_start:
        return None
    return _earliest_started(list(tasks))
