"""Règles de passage en retard (באיחור)."""
from __future__ import annotations

from datetime import datetime, timedelta

# Délai après l'échéance avant de marquer OVERDUE (évite באיחור immédiat si due ≈ now).
OVERDUE_GRACE_MINUTES = 15


def overdue_cutoff(now: datetime, *, grace_minutes: int = OVERDUE_GRACE_MINUTES) -> datetime:
    return now - timedelta(minutes=grace_minutes)


def is_past_due(
    due_at: datetime,
    now: datetime,
    *,
    grace_minutes: int = OVERDUE_GRACE_MINUTES,
) -> bool:
    return due_at < overdue_cutoff(now, grace_minutes=grace_minutes)
