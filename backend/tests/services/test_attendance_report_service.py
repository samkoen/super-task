"""Tests service דוח נוכחות — permissions + agrégation."""
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import MagicMock
from zoneinfo import ZoneInfo

import pytest

from app.domain import roles, task_status
from app.domain.scope import ActorContext
from app.models.branch import Branch
from app.models.user import User
from app.services.attendance_report_service import AttendanceReportService

TZ = ZoneInfo("Asia/Jerusalem")


def _svc(*, branches=None, users=None, tasks=None, completions=None, breaks=None, idle=None):
    occ = MagicMock()
    comp = MagicMock()
    users_repo = MagicMock()
    branches_repo = MagicMock()
    breaks_repo = MagicMock()
    notif_repo = MagicMock()
    branches_repo.list_branches.return_value = branches or []
    branches_repo.find_by_id.side_effect = lambda i: next(
        (b for b in (branches or []) if b.id == i), None
    )
    users_repo.list_users.return_value = users or []
    occ.list_occurrences.return_value = tasks or []
    comp.find_by_occurrence_ids.return_value = completions or {}
    breaks_repo.list_overlapping.return_value = breaks or []
    notif_repo.list_by_kinds_in_range.return_value = idle or []
    service = AttendanceReportService(
        occ, comp, users_repo, branches_repo, breaks_repo, notif_repo
    )
    return service


def test_employee_cannot_open_attendance():
    service = _svc()
    actor = ActorContext(
        user_id="e1", role=roles.EMPLOYEE, network_id="n1", branch_id="b1"
    )
    with pytest.raises(PermissionError):
        service.team_attendance_report(actor, branch_id="b1", period="today")


def test_empty_roster_has_zero_alerts():
    branches = [Branch(id="b1", network_id="n1", name="א")]
    service = _svc(branches=branches)
    actor = ActorContext(
        user_id="m1", role=roles.BRANCH_MANAGER, network_id="n1", branch_id="b1"
    )
    result = service.team_attendance_report(
        actor,
        branch_id="b1",
        period="today",
        now=datetime(2026, 8, 18, 12, 0, tzinfo=TZ),
    )
    assert result["employees"] == []
    assert result["summary"]["alert_count"] == 0
    assert result["summary"]["employees_count"] == 0


def test_overtime_and_clock_times_for_closed_shift():
    branches = [Branch(id="b1", network_id="n1", name="א")]
    emp = User(
        id="u1",
        email="a@b.c",
        first_name="יוסי",
        last_name="כהן",
        branch_id="b1",
    )
    start = SimpleNamespace(
        id="in",
        assignee_user_id="u1",
        due_at="2026-08-18T08:00:00+03:00",
        is_work_start=True,
        is_work_end=False,
        status=task_status.COMPLETED,
        started_at="2026-08-18T08:00:00+03:00",
    )
    end = SimpleNamespace(
        id="out",
        assignee_user_id="u1",
        due_at="2026-08-18T17:30:00+03:00",
        is_work_start=False,
        is_work_end=True,
        status=task_status.COMPLETED,
        started_at="2026-08-18T17:00:00+03:00",
    )
    completions = {
        "out": SimpleNamespace(completed_at="2026-08-18T17:30:00+03:00"),
    }
    service = _svc(
        branches=branches,
        users=[emp],
        tasks=[start, end],
        completions=completions,
    )
    actor = ActorContext(
        user_id="m1", role=roles.BRANCH_MANAGER, network_id="n1", branch_id="b1"
    )
    result = service.team_attendance_report(
        actor,
        branch_id="b1",
        period="today",
        now=datetime(2026, 8, 18, 20, 0, tzinfo=TZ),
    )
    row = result["employees"][0]
    assert row["clock_in"] == "2026-08-18T08:00:00+03:00"
    assert row["clock_out"] == "2026-08-18T17:30:00+03:00"
    assert row["worked_minutes"] == 9 * 60 + 30
    assert row["overtime_minutes"] == 90
    assert row["anomalies"] == []
    assert result["summary"]["total_overtime_minutes"] == 90
