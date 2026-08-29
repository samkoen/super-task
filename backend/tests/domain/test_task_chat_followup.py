from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.domain import task_status
from app.domain.task_chat_followup import (
    follow_up_is_pending,
    is_continuous_chat_task,
    is_open_chat_task,
    is_pending_follow_up_task,
    parse_future_follow_up,
    status_after_chat_resolve,
)

TZ = ZoneInfo("Asia/Jerusalem")
NOW = datetime(2026, 8, 29, 22, 0, tzinfo=TZ)


def test_unread_message_is_open_task_until_explicit_resolve():
    assert is_open_chat_task(task_status.AWAITING_RESPONSE, None)
    assert not is_open_chat_task(task_status.AWAITING_RESPONSE, NOW.isoformat())
    assert not is_open_chat_task(task_status.IN_PROGRESS, None)


def test_future_follow_up_leaves_continuous_screen():
    later = NOW + timedelta(hours=3)
    assert is_pending_follow_up_task(
        task_status.AWAITING_RESPONSE, resolved_at=None, follow_up_at=later, now=NOW
    )
    assert not is_continuous_chat_task(
        task_status.AWAITING_RESPONSE, resolved_at=None, follow_up_at=later, now=NOW
    )


def test_due_follow_up_returns_to_continuous_screen():
    past = NOW - timedelta(minutes=1)
    assert is_continuous_chat_task(
        task_status.AWAITING_RESPONSE, resolved_at=None, follow_up_at=past, now=NOW
    )
    assert not is_pending_follow_up_task(
        task_status.AWAITING_RESPONSE, resolved_at=None, follow_up_at=past, now=NOW
    )


def test_reading_does_not_change_open_flag():
    assert follow_up_is_pending(None, NOW) is False
    assert is_continuous_chat_task(
        task_status.AWAITING_RESPONSE, resolved_at=None, follow_up_at=None, now=NOW
    )


def test_resolve_moves_awaiting_to_in_progress():
    assert status_after_chat_resolve(task_status.AWAITING_RESPONSE) == task_status.IN_PROGRESS


def test_follow_up_must_be_in_the_future():
    later = (NOW + timedelta(days=1)).isoformat()
    assert parse_future_follow_up(later, NOW) > NOW
    try:
        parse_future_follow_up(NOW.isoformat(), NOW)
        raise AssertionError("expected past datetime to fail")
    except ValueError as exc:
        assert "עתידי" in str(exc)
