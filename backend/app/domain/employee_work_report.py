"""Agrégation pure — דוחות עובדים (volume / % / retards / durée / graphes)."""
from __future__ import annotations

from datetime import date, timedelta
from zoneinfo import ZoneInfo

from app.domain import task_status
from app.domain.fixed_task_expiry import counts_in_work_report
from app.domain.manager_dashboard import duration_minutes, parse_dt
from app.models.task_completion import TaskCompletion
from app.models.task_occurrence import TaskOccurrence
from app.models.user import User

ReportPeriod = str  # today | 7d | 30d

PERIODS = frozenset({"today", "7d", "30d"})


def resolve_report_range(period: str, *, today: date) -> tuple[date, date]:
    p = (period or "today").strip()
    if p not in PERIODS:
        raise ValueError("תקופה לא תקינה")
    if p == "7d":
        return today - timedelta(days=6), today
    if p == "30d":
        return today - timedelta(days=29), today
    return today, today


def _max_iso(*values: str | None) -> str | None:
    present = [v for v in values if v]
    return max(present) if present else None


def _task_due_day(task: TaskOccurrence, tz: ZoneInfo) -> date:
    return parse_dt(task.due_at, tz).date()


def _day_completion_pct(
    tasks: list[TaskOccurrence],
    completions: dict[str, TaskCompletion] | None = None,
) -> float:
    by_id = completions or {}
    assigned = [t for t in tasks if counts_in_work_report(t, by_id.get(t.id))]
    if not assigned:
        return 1.0
    done = sum(1 for t in assigned if t.status == task_status.COMPLETED)
    return round(done / len(assigned), 2)


def build_employee_report_row(
    employee: User,
    tasks: list[TaskOccurrence],
    completions: dict[str, TaskCompletion],
    *,
    tz: ZoneInfo,
    branch_names: dict[str, str] | None = None,
) -> dict:
    by_id = completions
    assigned = [t for t in tasks if counts_in_work_report(t, by_id.get(t.id))]
    completed = [t for t in assigned if t.status == task_status.COMPLETED]
    overdue = [t for t in assigned if t.status == task_status.OVERDUE]
    assigned_n = len(assigned)
    completed_n = len(completed)
    pct = round(completed_n / assigned_n, 2) if assigned_n else 1.0

    durations: list[int] = []
    last_activity: str | None = None
    for task in assigned:
        last_activity = _max_iso(last_activity, task.started_at)
        completion = completions.get(task.id)
        completed_at = completion.completed_at if completion else None
        last_activity = _max_iso(last_activity, completed_at)
        if task.started_at and completed_at:
            durations.append(
                duration_minutes(parse_dt(task.started_at, tz), parse_dt(completed_at, tz))
            )

    avg = round(sum(durations) / len(durations)) if durations else None
    names = branch_names or {}
    bid = employee.branch_id
    return {
        "user_id": employee.id,
        "full_name": employee.full_name,
        "job_function": employee.job_function,
        "branch_id": bid,
        "branch_name": names.get(bid) if bid else None,
        "is_active": employee.is_active,
        "assigned_count": assigned_n,
        "completed_count": completed_n,
        "completion_pct": pct,
        "overdue_count": len(overdue),
        "avg_completion_minutes": avg,
        "last_activity_at": last_activity,
    }


def aggregate_employee_reports(
    employees: list[User],
    tasks: list[TaskOccurrence],
    completions: dict[str, TaskCompletion],
    *,
    tz: ZoneInfo,
    branch_names: dict[str, str] | None = None,
) -> list[dict]:
    by_assignee: dict[str, list[TaskOccurrence]] = {e.id: [] for e in employees}
    for task in tasks:
        uid = task.assignee_user_id
        if uid and uid in by_assignee:
            by_assignee[uid].append(task)
    rows = [
        build_employee_report_row(
            emp, by_assignee[emp.id], completions, tz=tz, branch_names=branch_names
        )
        for emp in employees
    ]
    return sorted(
        rows,
        key=lambda r: (r["completion_pct"], -r["overdue_count"], r["full_name"]),
    )


def report_summary(rows: list[dict]) -> dict:
    if not rows:
        return {
            "employees_count": 0,
            "avg_completion_pct": 1.0,
            "total_completed": 0,
            "alert_count": 0,
        }
    total_assigned = sum(r["assigned_count"] for r in rows)
    total_completed = sum(r["completed_count"] for r in rows)
    avg_pct = (
        round(total_completed / total_assigned, 2) if total_assigned else 1.0
    )
    alerts = sum(
        1
        for r in rows
        if r["assigned_count"] > 0 and (r["completion_pct"] < 0.5 or r["overdue_count"] > 0)
    )
    return {
        "employees_count": len(rows),
        "avg_completion_pct": avg_pct,
        "total_completed": total_completed,
        "alert_count": alerts,
    }


def alert_breakdown(rows: list[dict]) -> list[dict]:
    """Tranches exclusives pour donut: ok | weak_pct | overdue | no_tasks."""
    counts = {"ok": 0, "weak_pct": 0, "overdue": 0, "no_tasks": 0}
    for r in rows:
        if r["assigned_count"] <= 0:
            counts["no_tasks"] += 1
        elif r["overdue_count"] > 0:
            counts["overdue"] += 1
        elif r["completion_pct"] < 0.5:
            counts["weak_pct"] += 1
        else:
            counts["ok"] += 1
    return [{"key": k, "count": n} for k, n in counts.items() if n > 0]


def daily_completion_series(
    tasks: list[TaskOccurrence],
    *,
    due_from: date,
    due_to: date,
    tz: ZoneInfo,
    completions: dict[str, TaskCompletion] | None = None,
) -> list[dict]:
    by_id = completions or {}
    by_day: dict[date, list[TaskOccurrence]] = {}
    for task in tasks:
        if not counts_in_work_report(task, by_id.get(task.id)):
            continue
        day = _task_due_day(task, tz)
        if due_from <= day <= due_to:
            by_day.setdefault(day, []).append(task)
    points: list[dict] = []
    cur = due_from
    while cur <= due_to:
        day_tasks = by_day.get(cur, [])
        assigned_n = len(day_tasks)
        completed_n = sum(1 for t in day_tasks if t.status == task_status.COMPLETED)
        points.append(
            {
                "day": cur.isoformat(),
                "assigned_count": assigned_n,
                "completed_count": completed_n,
                "completion_pct": _day_completion_pct(day_tasks, by_id),
            }
        )
        cur += timedelta(days=1)
    return points


def branch_completion_rows(
    tasks: list[TaskOccurrence],
    *,
    branch_names: dict[str, str],
    completions: dict[str, TaskCompletion] | None = None,
) -> list[dict]:
    by_id = completions or {}
    by_branch: dict[str, list[TaskOccurrence]] = {}
    for task in tasks:
        if not counts_in_work_report(task, by_id.get(task.id)):
            continue
        by_branch.setdefault(task.branch_id, []).append(task)
    rows: list[dict] = []
    for bid, branch_tasks in by_branch.items():
        assigned_n = len(branch_tasks)
        completed_n = sum(1 for t in branch_tasks if t.status == task_status.COMPLETED)
        overdue_n = sum(1 for t in branch_tasks if t.status == task_status.OVERDUE)
        pct = round(completed_n / assigned_n, 2) if assigned_n else 1.0
        rows.append(
            {
                "branch_id": bid,
                "branch_name": branch_names.get(bid) or bid,
                "assigned_count": assigned_n,
                "completed_count": completed_n,
                "overdue_count": overdue_n,
                "completion_pct": pct,
            }
        )
    return sorted(rows, key=lambda r: (r["completion_pct"], -r["overdue_count"]))


def build_report_charts(
    rows: list[dict],
    tasks: list[TaskOccurrence],
    *,
    due_from: date,
    due_to: date,
    tz: ZoneInfo,
    branch_names: dict[str, str],
    completions: dict[str, TaskCompletion] | None = None,
) -> dict:
    return {
        "alert_breakdown": alert_breakdown(rows),
        "daily_series": daily_completion_series(
            tasks, due_from=due_from, due_to=due_to, tz=tz, completions=completions
        ),
        "by_branch": branch_completion_rows(
            tasks, branch_names=branch_names, completions=completions
        ),
    }
