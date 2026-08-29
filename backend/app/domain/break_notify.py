"""Règles pures — silence des alertes pendant הפסקה."""
from __future__ import annotations

from datetime import datetime, timezone


def muted_employee_sound(*, on_break: bool, force_sound: bool = False) -> bool:
    """True = pas de צלצול chez l'oved (sauf urgence menahel)."""
    return bool(on_break) and not bool(force_sound)


def break_alert_payload(on_break_since: datetime | None, *, now: datetime) -> dict | None:
    if on_break_since is None:
        return None
    since = on_break_since if on_break_since.tzinfo else on_break_since.replace(tzinfo=timezone.utc)
    current = now if now.tzinfo else now.replace(tzinfo=timezone.utc)
    elapsed = int((current - since).total_seconds())
    return {
        "on_break": True,
        "on_break_since": since.isoformat(),
        "elapsed_seconds": max(0, elapsed),
    }
