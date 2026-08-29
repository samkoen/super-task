"""דוח נוכחות — agrégation pointage / pauses / heures pour le menahel."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from zoneinfo import ZoneInfo

from app.domain.attendance import (
    IDLE_KINDS,
    aggregate_employee_attendance,
    attendance_summary,
    build_day_row,
    day_bounds,
    iter_days,
)
from app.domain.employee_work_report import resolve_report_range
from app.domain.manager_dashboard import parse_dt
from app.domain.scope import ActorContext
from app.domain.task_scope import can_manage_tasks
from app.domain.team_roster import worker_roles_for_roster
from app.repositories.branch_repository import BranchRepository
from app.repositories.employee_break_repository import EmployeeBreakRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.task_completion_repository import TaskCompletionRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.user_repository import UserRepository
from app.services.employee_report_service import resolve_team_report_scope

TZ = ZoneInfo("Asia/Jerusalem")


class AttendanceReportService:
    def __init__(
        self,
        occurrence_repo: TaskOccurrenceRepository,
        completion_repo: TaskCompletionRepository,
        user_repo: UserRepository,
        branch_repo: BranchRepository,
        break_repo: EmployeeBreakRepository,
        notification_repo: NotificationRepository,
    ):
        self._occurrences = occurrence_repo
        self._completions = completion_repo
        self._users = user_repo
        self._branches = branch_repo
        self._breaks = break_repo
        self._notifications = notification_repo

    def team_attendance_report(
        self,
        actor: ActorContext,
        *,
        branch_id: str | None,
        period: str = "today",
        now: datetime | None = None,
    ) -> dict:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה לדוחות")
        current = now or datetime.now(TZ)
        branch_ids, scope_branch_id, scope_label = resolve_team_report_scope(
            actor, branch_id, self._branches
        )
        due_from, due_to = resolve_report_range(period, today=current.date())
        employees = self._users.list_users(
            roles_in=worker_roles_for_roster(actor.role),
            branch_ids=branch_ids,
        )
        rows = self._build_rows(employees, branch_ids, due_from, due_to, current)
        return {
            "period": period,
            "due_from": due_from.isoformat(),
            "due_to": due_to.isoformat(),
            "branch_id": scope_branch_id,
            "branch_name": scope_label,
            "network_wide": scope_branch_id is None,
            "summary": attendance_summary(rows),
            "employees": rows,
        }

    def _period_inputs(self, employees, branch_ids, due_from, due_to):
        tasks = self._occurrences.list_occurrences(
            branch_ids=branch_ids, due_from=due_from, due_to=due_to
        )
        range_start, _ = day_bounds(due_from, TZ)
        _, range_end = day_bounds(due_to, TZ)
        user_ids = [e.id for e in employees]
        return (
            self._completions.find_by_occurrence_ids([t.id for t in tasks]),
            {
                b.id: b.name
                for bid in branch_ids
                if (b := self._branches.find_by_id(bid))
            },
            self._group_tasks(tasks),
            self._group_by_user(
                self._breaks.list_overlapping(user_ids, start=range_start, end=range_end)
            ),
            self._group_idle(
                self._notifications.list_by_kinds_in_range(
                    user_ids=user_ids,
                    kinds=list(IDLE_KINDS),
                    created_from=range_start,
                    created_to=range_end,
                )
            ),
        )

    def _build_rows(self, employees, branch_ids, due_from, due_to, now: datetime) -> list[dict]:
        completions, branch_names, by_user_day, breaks_by_user, idle_by_user_day = (
            self._period_inputs(employees, branch_ids, due_from, due_to)
        )
        today = now.date()
        rows = [
            aggregate_employee_attendance(
                emp,
                self._days_for_employee(
                    emp.id,
                    due_from,
                    due_to,
                    today,
                    by_user_day,
                    completions,
                    breaks_by_user,
                    idle_by_user_day,
                ),
                branch_names=branch_names,
            )
            for emp in employees
        ]
        return sorted(rows, key=lambda r: (-len(r["anomalies"]), r["full_name"]))

    def _days_for_employee(
        self,
        user_id,
        due_from,
        due_to,
        today,
        by_user_day,
        completions,
        breaks_by_user,
        idle_by_user_day,
    ) -> list[dict]:
        prev_unclosed = False
        day_rows: list[dict] = []
        user_breaks = breaks_by_user.get(user_id, [])
        for day in iter_days(due_from, due_to):
            tasks = by_user_day.get((user_id, day), [])
            row = build_day_row(
                day=day,
                tasks=tasks,
                completions=completions,
                breaks=user_breaks,
                idle_count=idle_by_user_day.get((user_id, day), 0),
                day_is_past=day < today,
                prev_unclosed=prev_unclosed,
                tz=TZ,
            )
            day_rows.append(row)
            prev_unclosed = bool(row["clock_in"] and not row["clock_out"])
        return day_rows

    @staticmethod
    def _group_tasks(tasks) -> dict:
        grouped: dict[tuple[str, object], list] = defaultdict(list)
        for task in tasks:
            uid = task.assignee_user_id
            if not uid:
                continue
            day = parse_dt(task.due_at, TZ).date()
            grouped[(uid, day)].append(task)
        return grouped

    @staticmethod
    def _group_by_user(items) -> dict[str, list]:
        grouped: dict[str, list] = defaultdict(list)
        for item in items:
            grouped[item.user_id].append(item)
        return grouped

    @staticmethod
    def _group_idle(notifications) -> dict[tuple[str, object], int]:
        counts: dict[tuple[str, object], int] = defaultdict(int)
        for note in notifications:
            day = parse_dt(note.created_at, TZ).date()
            counts[(note.user_id, day)] += 1
        return counts
