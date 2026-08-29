"""Règles pures : message non traité = tâche chat ouverte (sans clôture à la lecture)."""
from __future__ import annotations

from datetime import datetime

from app.domain import task_status


def follow_up_is_pending(follow_up_at: datetime | None, now: datetime) -> bool:
    if follow_up_at is None:
        return False
    at = follow_up_at if follow_up_at.tzinfo else follow_up_at.replace(tzinfo=now.tzinfo)
    return at > now


def is_open_chat_task(status: str, resolved_at: datetime | str | None) -> bool:
    return status == task_status.AWAITING_RESPONSE and not resolved_at


def is_continuous_chat_task(
    status: str,
    *,
    resolved_at: datetime | str | None,
    follow_up_at: datetime | None,
    now: datetime,
) -> bool:
    if not is_open_chat_task(status, resolved_at):
        return False
    return not follow_up_is_pending(follow_up_at, now)


def is_pending_follow_up_task(
    status: str,
    *,
    resolved_at: datetime | str | None,
    follow_up_at: datetime | None,
    now: datetime,
) -> bool:
    if not is_open_chat_task(status, resolved_at):
        return False
    return follow_up_is_pending(follow_up_at, now)


def status_after_chat_resolve(current: str) -> str:
    if current == task_status.AWAITING_RESPONSE:
        return task_status.IN_PROGRESS
    return current


def parse_future_follow_up(raw: str, now: datetime) -> datetime:
    value = (raw or "").strip()
    if not value:
        raise ValueError("יש לבחור מועד מעקב")
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=now.tzinfo)
    if dt <= now:
        raise ValueError("יש לבחור מועד מעקב עתידי")
    return dt
