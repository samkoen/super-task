"""Règles de récurrence des tâches (sans I/O)."""
from __future__ import annotations

from datetime import date, datetime, time
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Asia/Jerusalem")

ONCE = "once"
DAILY = "daily"
WEEKLY = "weekly"
BIWEEKLY = "biweekly"
MONTHLY = "monthly"

ALL = {ONCE, DAILY, WEEKLY, BIWEEKLY, MONTHLY}
RECURRING = {DAILY, WEEKLY, BIWEEKLY}


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


def parse_weekly_days(value: str | None) -> set[int]:
    if not value:
        return set()
    out: set[int] = set()
    for part in value.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            day = int(part)
        except ValueError:
            continue
        if 0 <= day <= 6:
            out.add(day)
    return out


def should_generate_on_date(
    recurrence: str,
    weekly_days: str | None,
    day: date,
    *,
    anchor_date: date | None = None,
) -> bool:
    if recurrence == DAILY:
        return True
    if recurrence in {WEEKLY, BIWEEKLY}:
        if day.weekday() not in parse_weekly_days(weekly_days):
            return False
        if recurrence == WEEKLY:
            return True
        anchor = anchor_date or day
        weeks = (day - anchor).days // 7
        return weeks >= 0 and weeks % 2 == 0
    return False
