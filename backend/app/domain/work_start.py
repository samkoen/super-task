"""Pointage : tâche קבועה marquée « début de travail »."""
from __future__ import annotations

from datetime import datetime

from app.domain import task_status
from app.domain.completion_media import VISUAL_KINDS, normalize_captured_at

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


def first_visual_captured_at(attachments: list | None) -> str | None:
    """Plus tôt captured_at parmi les preuves photo/vidéo (pas l'audio)."""
    earliest_iso: str | None = None
    earliest_dt: datetime | None = None
    for item in attachments or []:
        if not isinstance(item, dict):
            continue
        if item.get("kind") not in VISUAL_KINDS:
            continue
        if not str(item.get("url") or "").strip():
            continue
        captured = normalize_captured_at(item.get("captured_at"))
        if not captured:
            continue
        when = datetime.fromisoformat(captured)
        if earliest_dt is None or when < earliest_dt:
            earliest_dt = when
            earliest_iso = captured
    return earliest_iso


def arrival_at_from_visual(attachments: list | None, *, now: datetime) -> datetime | None:
    """Arrivée = 1re photo/vidéo obligatoire, bornée à maintenant."""
    iso = first_visual_captured_at(attachments)
    if not iso:
        return None
    when = datetime.fromisoformat(iso)
    return now if when > now else when


def clock_in_at(tasks: list, *, fallback_any_start: bool = True) -> str | None:
    """Heure d'arrivée = started_at de la tâche pointage fermée.

    started_at est calé sur la 1re photo/vidéo obligatoire à la clôture.
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
