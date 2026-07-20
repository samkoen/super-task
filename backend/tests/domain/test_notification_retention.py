from datetime import datetime
from zoneinfo import ZoneInfo

from app.domain.notification_retention import notification_purge_cutoff

TZ = ZoneInfo("Asia/Jerusalem")


def test_purge_cutoff_is_seven_days_ago():
    now = datetime(2026, 7, 20, 12, 0, tzinfo=TZ)
    cutoff = notification_purge_cutoff(now)
    assert cutoff == datetime(2026, 7, 13, 12, 0, tzinfo=TZ)
