"""Règles de récurrence des tâches (sans I/O)."""
from __future__ import annotations

import calendar
from datetime import date, datetime, time
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Asia/Jerusalem")

ONCE = "once"
DAILY = "daily"
WEEKLY = "weekly"
BIWEEKLY = "biweekly"
MONTHLY = "monthly"

ALL = {ONCE, DAILY, WEEKLY, BIWEEKLY, MONTHLY}
RECURRING = {DAILY, WEEKLY, MONTHLY}


def uses_weekly_days(recurrence: str) -> bool:
    return recurrence in {DAILY, WEEKLY, BIWEEKLY}


def parse_due_time(value: str | None, *, default: time = time(23, 59)) -> time:
    raw = (value or "").strip()
    if not raw:
        return default
    parts = raw.split(":")
    if len(parts) != 2:
        return default
    try:
        return time(int(parts[0]), int(parts[1]))
    except ValueError:
        return default


def due_at_for_date(day: date, due_time_str: str | None) -> datetime:
    t = parse_due_time(due_time_str)
    return datetime.combine(day, t, tzinfo=TZ)


# Ordre d'affichage : dimanche → samedi. 0 = lundi reste valide (pas « vide »).
_WEEKDAY_ORDER = (6, 0, 1, 2, 3, 4, 5)


def parse_weekly_days(value: object | None) -> set[int]:
    parts = _weekday_parts(value)
    out: set[int] = set()
    for part in parts:
        try:
            day = int(part)
        except ValueError:
            continue
        if 0 <= day <= 6:
            out.add(day)
    return out


def _weekday_parts(value: object | None) -> list[str]:
    if value is None or value is False:
        return []
    if isinstance(value, (list, tuple, set)):
        return [str(part).strip() for part in value if str(part).strip()]
    text = str(value).strip()
    if not text:
        return []
    return [part.strip() for part in text.split(",") if part.strip()]


def coerce_weekly_days(value: object | None) -> str | None:
    """Un seul jour (0, \"0\", [\"2\"]) reste une chaîne non vide."""
    selected = parse_weekly_days(value)
    if not selected:
        return None
    return ",".join(str(day) for day in _WEEKDAY_ORDER if day in selected)


def stored_weekly_days(recurrence: str, value: object | None) -> str | None:
    if not uses_weekly_days(recurrence):
        return None
    days = coerce_weekly_days(value)
    if recurrence == WEEKLY and not days:
        raise ValueError("נדרש יום בשבוע למשימה שבועית")
    return days


def should_generate_on_date(
    recurrence: str,
    weekly_days: str | None,
    day: date,
    *,
    anchor_date: date | None = None,
    monthly_day: int | None = None,
) -> bool:
    _ = anchor_date
    if recurrence == DAILY:
        selected = parse_weekly_days(weekly_days)
        if not selected:
            return True
        return day.weekday() in selected
    if recurrence in {WEEKLY, BIWEEKLY}:
        return day.weekday() in parse_weekly_days(weekly_days)
    if recurrence == MONTHLY:
        target = monthly_day or 1
        if target < 1:
            target = 1
        if target > 31:
            target = 31
        last_day = calendar.monthrange(day.year, day.month)[1]
        return day.day == min(target, last_day)
    return False
