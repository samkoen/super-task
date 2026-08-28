"""Règles pures — דוח נוכחות (pointage, pauses, heures, anomalies)."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.domain.employee_inactivity import IDLE_KIND_BY_REASON
from app.domain.manager_dashboard import parse_dt
from app.domain.team_roster import effective_job_function
from app.domain.work_start import CLOCK_IN_STATUSES, clock_in_at
from app.models.task_completion import TaskCompletion
from app.models.user import User

REGULAR_DAY_MINUTES = 8 * 60

MISSING_CLOCK_IN = "missing_clock_in"
MISSING_CLOCK_OUT = "missing_clock_out"
INVERTED = "inverted"
OVERLAP = "overlap"
OPEN_BREAK = "open_break"
IDLE = "idle"

IDLE_KINDS = frozenset({*IDLE_KIND_BY_REASON.values(), "employee_idle"})


def day_bounds(day: date, tz: ZoneInfo) -> tuple[datetime, datetime]:
    start = datetime.combine(day, time(0, 0), tzinfo=tz)
    return start, start + timedelta(days=1)


def clock_out_at(tasks: list, completions: dict[str, TaskCompletion] | None) -> str | None:
    """Sortie = completed_at de la tâche is_work_end fermée (plus tardive)."""
    by_id = completions or {}
    latest: str | None = None
    for task in tasks:
        if not getattr(task, "is_work_end", False):
            continue
        if getattr(task, "status", None) not in CLOCK_IN_STATUSES:
            continue
        completion = by_id.get(getattr(task, "id", ""))
        done_at = getattr(completion, "completed_at", None) if completion else None
        if done_at and (latest is None or done_at > latest):
            latest = done_at
    return latest


def interval_overlap_minutes(
    started_at: datetime,
    ended_at: datetime | None,
    window_start: datetime,
    window_end: datetime,
) -> int:
    start = max(started_at, window_start)
    end = min(ended_at or window_end, window_end)
    if end <= start:
        return 0
    return int((end - start).total_seconds() // 60)


def break_stats(
    intervals: list,
    window_start: datetime,
    window_end: datetime,
    *,
    tz: ZoneInfo,
) -> tuple[int, bool]:
    total = 0
    open_break = False
    for item in intervals:
        started = parse_dt(item.started_at, tz)
        ended = parse_dt(item.ended_at, tz) if item.ended_at else None
        minutes = interval_overlap_minutes(started, ended, window_start, window_end)
        if minutes <= 0:
            continue
        total += minutes
        if ended is None:
            open_break = True
    return total, open_break


def worked_minutes(
    clock_in: str | None,
    clock_out: str | None,
    break_min: int,
    *,
    tz: ZoneInfo,
) -> int | None:
    if not clock_in or not clock_out:
        return None
    start = parse_dt(clock_in, tz)
    end = parse_dt(clock_out, tz)
    if end <= start:
        return None
    raw = int((end - start).total_seconds() // 60)
    return max(0, raw - max(0, break_min))


def overtime_minutes(worked: int | None, *, regular: int = REGULAR_DAY_MINUTES) -> int:
    if worked is None:
        return 0
    return max(0, worked - regular)


def expects_attendance(tasks: list) -> bool:
    for task in tasks:
        if getattr(task, "is_work_start", False) or getattr(task, "is_work_end", False):
            return True
        if getattr(task, "started_at", None):
            return True
        if getattr(task, "status", None) in CLOCK_IN_STATUSES:
            return True
    return False


def day_anomalies(
    *,
    clock_in: str | None,
    clock_out: str | None,
    open_break: bool,
    idle_count: int,
    day_is_past: bool,
    prev_unclosed: bool,
    expect_punch: bool,
) -> list[str]:
    codes: list[str] = []
    if expect_punch and not clock_in:
        codes.append(MISSING_CLOCK_IN)
    if clock_in and not clock_out and day_is_past:
        codes.append(MISSING_CLOCK_OUT)
    if clock_in and clock_out and clock_out < clock_in:
        codes.append(INVERTED)
    if prev_unclosed and clock_in:
        codes.append(OVERLAP)
    if open_break:
        codes.append(OPEN_BREAK)
    if idle_count > 0:
        codes.append(IDLE)
    return codes


def build_day_row(
    *,
    day: date,
    tasks: list,
    completions: dict[str, TaskCompletion],
    breaks: list,
    idle_count: int,
    day_is_past: bool,
    prev_unclosed: bool,
    tz: ZoneInfo,
) -> dict:
    start, end = day_bounds(day, tz)
    clock_in = clock_in_at(tasks, fallback_any_start=False)
    clock_out = clock_out_at(tasks, completions)
    break_min, open_brk = break_stats(breaks, start, end, tz=tz)
    worked = worked_minutes(clock_in, clock_out, break_min, tz=tz)
    return {
        "day": day.isoformat(),
        "clock_in": clock_in,
        "clock_out": clock_out,
        "break_minutes": break_min,
        "worked_minutes": worked,
        "overtime_minutes": overtime_minutes(worked),
        "idle_count": idle_count,
        "anomalies": day_anomalies(
            clock_in=clock_in,
            clock_out=clock_out,
            open_break=open_brk,
            idle_count=idle_count,
            day_is_past=day_is_past,
            prev_unclosed=prev_unclosed,
            expect_punch=expects_attendance(tasks),
        ),
    }


def _iso_min(values: list[str | None]) -> str | None:
    present = [v for v in values if v]
    return min(present) if present else None


def _iso_max(values: list[str | None]) -> str | None:
    present = [v for v in values if v]
    return max(present) if present else None


def aggregate_employee_attendance(
    employee: User,
    day_rows: list[dict],
    *,
    branch_names: dict[str, str] | None = None,
) -> dict:
    names = branch_names or {}
    bid = employee.branch_id
    anomalies = [
        {"code": code, "day": row["day"]}
        for row in day_rows
        for code in row["anomalies"]
    ]
    return {
        "user_id": employee.id,
        "full_name": employee.full_name,
        "job_function": effective_job_function(employee.role, employee.job_function),
        "branch_id": bid,
        "branch_name": names.get(bid) if bid else None,
        "is_active": employee.is_active,
        "clock_in": _iso_min([row["clock_in"] for row in day_rows]),
        "clock_out": _iso_max([row["clock_out"] for row in day_rows]),
        "worked_minutes": sum(row["worked_minutes"] or 0 for row in day_rows),
        "overtime_minutes": sum(row["overtime_minutes"] for row in day_rows),
        "break_minutes": sum(row["break_minutes"] for row in day_rows),
        "days_present": sum(1 for row in day_rows if row["clock_in"]),
        "idle_count": sum(row["idle_count"] for row in day_rows),
        "anomalies": anomalies,
        "days": day_rows,
    }


def attendance_summary(rows: list[dict]) -> dict:
    if not rows:
        return {
            "employees_count": 0,
            "total_worked_minutes": 0,
            "total_overtime_minutes": 0,
            "total_break_minutes": 0,
            "alert_count": 0,
        }
    return {
        "employees_count": len(rows),
        "total_worked_minutes": sum(r["worked_minutes"] for r in rows),
        "total_overtime_minutes": sum(r["overtime_minutes"] for r in rows),
        "total_break_minutes": sum(r["break_minutes"] for r in rows),
        "alert_count": sum(1 for r in rows if r["anomalies"]),
    }


def iter_days(due_from: date, due_to: date):
    day = due_from
    while day <= due_to:
        yield day
        day += timedelta(days=1)
