"""Rétention des alertes in-app."""
from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Asia/Jerusalem")
NOTIFICATION_RETENTION_DAYS = 7


def notification_purge_cutoff(
    now: datetime | None = None,
    *,
    days: int = NOTIFICATION_RETENTION_DAYS,
) -> datetime:
    moment = now or datetime.now(TZ)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=TZ)
    return moment - timedelta(days=days)
