from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from app.domain.media_retention_policy import (
    finished_at,
    media_is_due,
    parse_retention_days,
)

TZ = ZoneInfo("Asia/Jerusalem")


def test_parse_retention_days_accepts_bounds():
    assert parse_retention_days(0) == 0
    assert parse_retention_days("365") == 365
    assert parse_retention_days(7) == 7


def test_parse_retention_days_rejects_invalid():
    for raw in (-1, 366, "1.5", "", True, None):
        with pytest.raises(ValueError):
            parse_retention_days(raw)


def test_finished_at_prefers_manager_review():
    when = finished_at("2026-03-02T10:00:00+02:00", "2026-03-01T10:00:00+02:00")
    assert when is not None
    assert when.day == 2


def test_media_is_due_uses_the_day_count():
    now = datetime(2026, 3, 10, 12, 0, tzinfo=TZ)
    anchor = now - timedelta(days=3)
    assert media_is_due(anchor, 7, now) is False
    assert media_is_due(anchor, 3, now) is True
    assert media_is_due(None, 7, now) is True
