"""Tâches visibles le jour J : fenêtre calendaire métier (pas la date UTC SQL)."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from app.domain.employee_task_carry_over import start_of_day


def due_window(day: date, tz: ZoneInfo) -> tuple[datetime, datetime]:
    """Bornes [start, end) du jour calendaire métier."""
    start = start_of_day(day, tz)
    return start, start + timedelta(days=1)
