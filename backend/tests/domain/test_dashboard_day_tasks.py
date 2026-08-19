"""Tâches du jour : fenêtre TZ Jérusalem."""
from __future__ import annotations

from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from app.domain.dashboard_day_tasks import due_window

TZ = ZoneInfo("Asia/Jerusalem")


def test_due_window_covers_early_morning_israel_not_utc_yesterday():
    day = date(2026, 8, 19)
    start, end = due_window(day, TZ)
    early = datetime.combine(day, time(0, 30), tzinfo=TZ)
    assert start <= early < end
    assert early.astimezone(ZoneInfo("UTC")).date() == date(2026, 8, 18)
