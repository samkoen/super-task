"""Tests silence / payload הפסקה pour le menahel."""
from datetime import datetime, timedelta, timezone

from app.domain.break_notify import break_alert_payload, muted_employee_sound

TZ = timezone(timedelta(hours=3))


def test_muted_on_break_unless_forced():
    assert muted_employee_sound(on_break=True) is True
    assert muted_employee_sound(on_break=True, force_sound=True) is False
    assert muted_employee_sound(on_break=False) is False
    assert muted_employee_sound(on_break=False, force_sound=True) is False


def test_break_alert_payload_none_when_not_on_break():
    assert break_alert_payload(None, now=datetime.now(TZ)) is None


def test_break_alert_includes_start_and_elapsed():
    start = datetime(2026, 8, 28, 10, 0, tzinfo=TZ)
    now = datetime(2026, 8, 28, 10, 12, tzinfo=TZ)
    row = break_alert_payload(start, now=now)
    assert row is not None
    assert row["on_break"] is True
    assert row["on_break_since"] == start.isoformat()
    assert row["elapsed_seconds"] == 12 * 60
