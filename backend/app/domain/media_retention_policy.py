"""Durée de conservation des médias d'une tâche terminée."""
from __future__ import annotations

from datetime import datetime, timedelta

MIN_RETENTION_DAYS = 0
MAX_RETENTION_DAYS = 365
DEFAULT_RETENTION_DAYS = 1
MEDIA_RETENTION_DAYS_KEY = "media_retention_days"
_INVALID_DAYS = "יש להזין מספר ימים בין 0 ל-365"


def parse_retention_days(raw: object) -> int:
    days = _as_day_count(raw)
    if days < MIN_RETENTION_DAYS or days > MAX_RETENTION_DAYS:
        raise ValueError(_INVALID_DAYS)
    return days


def finished_at(reviewed_at: str | None, completed_at: str | None) -> datetime | None:
    raw = (reviewed_at or "").strip() or (completed_at or "").strip()
    if not raw:
        return None
    return datetime.fromisoformat(raw.replace("Z", "+00:00"))


def media_is_due(anchor: datetime | None, days: int, now: datetime) -> bool:
    """Sans date de fin, une purge déjà planifiée part quand même."""
    if anchor is None:
        return True
    start = anchor if anchor.tzinfo else anchor.replace(tzinfo=now.tzinfo)
    return start + timedelta(days=days) <= now


def _as_day_count(raw: object) -> int:
    if isinstance(raw, bool):
        raise ValueError(_INVALID_DAYS)
    if isinstance(raw, int):
        return raw
    text = str(raw or "").strip()
    if not text.isdigit():
        raise ValueError(_INVALID_DAYS)
    return int(text)
