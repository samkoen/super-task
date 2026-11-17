"""Durée prévue d'une tâche en minutes (« 15 דק׳ » sur l'écran המשימות להיום de l'oved)."""
from __future__ import annotations

MAX_DURATION_MINUTES = 480


def normalize_duration_minutes(value: object | None) -> int | None:
    """None / 0 / vide → pas de durée. 1 à 480 minutes sinon."""
    if value is None or value is False:
        return None
    if isinstance(value, str) and not value.strip():
        return None
    if isinstance(value, float) and not value.is_integer():
        raise ValueError("משך המשימה חייב להיות מספר דקות שלם")
    try:
        minutes = int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        raise ValueError("משך המשימה לא תקין")
    if minutes <= 0:
        return None
    if minutes > MAX_DURATION_MINUTES:
        raise ValueError(f"משך המשימה לא יכול לעלות על {MAX_DURATION_MINUTES} דקות")
    return minutes
