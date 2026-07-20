"""Règles pures inactivité employé (30 min sans in_progress)."""
from __future__ import annotations

from datetime import date, datetime, time
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Asia/Jerusalem")
IDLE_MINUTES = 30
DAY_START = time(8, 0)
DAY_END = time(22, 0)

REASON_NO_TASKS = "no_tasks"
REASON_HAS_TASKS = "has_tasks_not_started"
REASON_ON_BREAK = "on_break"

IDLE_KIND_BY_REASON = {
    REASON_NO_TASKS: "employee_idle_no_tasks",
    REASON_HAS_TASKS: "employee_idle_has_tasks",
    REASON_ON_BREAK: "employee_idle_on_break",
}


def workday_bounds(day: date, tz: ZoneInfo = TZ) -> tuple[datetime, datetime]:
    start = datetime.combine(day, DAY_START, tzinfo=tz)
    end = datetime.combine(day, DAY_END, tzinfo=tz)
    return start, end


def is_within_work_window(now: datetime, tz: ZoneInfo = TZ) -> bool:
    local = now.astimezone(tz) if now.tzinfo else now.replace(tzinfo=tz)
    start, end = workday_bounds(local.date(), tz)
    return start <= local <= end


def idle_reason(*, on_break: bool, open_task_count: int) -> str:
    if on_break:
        return REASON_ON_BREAK
    if open_task_count <= 0:
        return REASON_NO_TASKS
    return REASON_HAS_TASKS


def should_evaluate_idle(
    *,
    now: datetime,
    has_started_task_today: bool,
    has_in_progress: bool,
    already_notified_episode: bool,
) -> bool:
    """True si on peut encore émettre une alerte d'inactivité."""
    if not is_within_work_window(now):
        return False
    if not has_started_task_today:
        return False
    if has_in_progress:
        return False
    if already_notified_episode:
        return False
    return True


def idle_threshold_reached(idle_since: datetime, now: datetime, *, minutes: int = IDLE_MINUTES) -> bool:
    if idle_since.tzinfo is None:
        idle_since = idle_since.replace(tzinfo=TZ)
    if now.tzinfo is None:
        now = now.replace(tzinfo=TZ)
    return (now - idle_since).total_seconds() >= minutes * 60


def kind_for_reason(reason: str) -> str:
    return IDLE_KIND_BY_REASON.get(reason, "employee_idle")
