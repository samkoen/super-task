"""דוחות עובדים — volume / % / retards pour le menahel."""
from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from app.domain import roles
from app.domain.employee_work_report import (
    aggregate_employee_reports,
    build_report_charts,
    report_summary,
    resolve_report_range,
)
from app.domain.scope import ActorContext, assert_branch_visible
from app.domain.task_scope import can_manage_tasks, visible_branch_ids_for_tasks
from app.domain.team_roster import worker_roles_for_roster
from app.repositories.branch_repository import BranchRepository
from app.repositories.task_completion_repository import TaskCompletionRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.user_repository import UserRepository

TZ = ZoneInfo("Asia/Jerusalem")


def resolve_team_report_scope(
    actor: ActorContext,
    branch_id: str | None,
    branches: BranchRepository,
) -> tuple[list[str], str | None, str]:
    visible = visible_branch_ids_for_tasks(actor, branches)
    bid = (branch_id or "").strip()

    if not bid:
        if actor.role == roles.BRANCH_MANAGER:
            bid = (actor.branch_id or "").strip()
            if not bid:
                raise ValueError("נדרש סניף")
        else:
            ids = (
                [s.id for s in branches.list_branches()]
                if visible is None
                else visible
            )
            if not ids:
                raise ValueError("אין סניפים בדוח")
            return ids, None, "כל הרשת"

    if visible is not None and bid not in visible:
        raise PermissionError("אין הרשאה לסניף זה")
    branch = branches.find_by_id(bid)
    if not branch:
        raise ValueError("סניף לא נמצא")
    assert_branch_visible(actor, branch.network_id, branch.id)
    return [bid], bid, branch.name


class EmployeeReportService:
    def __init__(
        self,
        occurrence_repo: TaskOccurrenceRepository,
        completion_repo: TaskCompletionRepository,
        user_repo: UserRepository,
        branch_repo: BranchRepository,
    ):
        self._occurrences = occurrence_repo
        self._completions = completion_repo
        self._users = user_repo
        self._branches = branch_repo

    def team_work_report(
        self,
        actor: ActorContext,
        *,
        branch_id: str | None,
        period: str = "today",
    ) -> dict:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה לדוחות")
        branch_ids, scope_branch_id, scope_label = resolve_team_report_scope(
            actor, branch_id, self._branches
        )
        due_from, due_to = resolve_report_range(period, today=datetime.now(TZ).date())
        employees = self._users.list_users(
            roles_in=worker_roles_for_roster(actor.role),
            branch_ids=branch_ids,
        )
        tasks = self._occurrences.list_occurrences(
            branch_ids=branch_ids,
            due_from=due_from,
            due_to=due_to,
        )
        completions = self._completions.find_by_occurrence_ids([t.id for t in tasks])
        branch_names = {
            b.id: b.name
            for bid in branch_ids
            if (b := self._branches.find_by_id(bid))
        }
        rows = aggregate_employee_reports(
            employees, tasks, completions, tz=TZ, branch_names=branch_names
        )
        charts = build_report_charts(
            rows,
            tasks,
            due_from=due_from,
            due_to=due_to,
            tz=TZ,
            branch_names=branch_names,
            completions=completions,
        )
        return {
            "period": period,
            "due_from": due_from.isoformat(),
            "due_to": due_to.isoformat(),
            "branch_id": scope_branch_id,
            "branch_name": scope_label,
            "network_wide": scope_branch_id is None,
            "summary": report_summary(rows),
            "charts": charts,
            "employees": rows,
        }
