"""Tests service דוחות — snif vs כל הרשת."""
from unittest.mock import MagicMock

import pytest

from app.domain import roles
from app.domain.scope import ActorContext
from app.models.branch import Branch
from app.services.employee_report_service import EmployeeReportService


def _svc(*, branches=None, users=None, tasks=None):
    occ = MagicMock()
    comp = MagicMock()
    users_repo = MagicMock()
    branches_repo = MagicMock()
    branches_repo.list_branches.return_value = branches or []
    branches_repo.find_by_id.side_effect = lambda i: next(
        (b for b in (branches or []) if b.id == i), None
    )
    users_repo.list_users.return_value = users or []
    occ.list_occurrences.return_value = tasks or []
    comp.find_by_occurrence_ids.return_value = {}
    return EmployeeReportService(occ, comp, users_repo, branches_repo), occ, users_repo, branches_repo


def test_network_manager_without_branch_aggregates_all_visible():
    branches = [
        Branch(id="b1", network_id="n1", name="א"),
        Branch(id="b2", network_id="n1", name="ב"),
    ]
    service, occ, users_repo, _ = _svc(branches=branches)
    actor = ActorContext(
        user_id="m1", role=roles.NETWORK_MANAGER, network_id="n1", branch_id="b1"
    )

    result = service.team_work_report(actor, branch_id=None, period="today")

    assert result["network_wide"] is True
    assert result["branch_id"] is None
    assert result["branch_name"] == "כל הרשת"
    users_repo.list_users.assert_called_once()
    assert users_repo.list_users.call_args.kwargs["branch_ids"] == ["b1", "b2"]
    assert occ.list_occurrences.call_args.kwargs["branch_ids"] == ["b1", "b2"]


def test_network_manager_with_branch_filters_one_snif():
    branches = [
        Branch(id="b1", network_id="n1", name="א"),
        Branch(id="b2", network_id="n1", name="ב"),
    ]
    service, occ, users_repo, _ = _svc(branches=branches)
    actor = ActorContext(
        user_id="m1", role=roles.NETWORK_MANAGER, network_id="n1", branch_id="b1"
    )

    result = service.team_work_report(actor, branch_id="b2", period="7d")

    assert result["network_wide"] is False
    assert result["branch_id"] == "b2"
    assert result["branch_name"] == "ב"
    assert users_repo.list_users.call_args.kwargs["branch_ids"] == ["b2"]
    assert occ.list_occurrences.call_args.kwargs["branch_ids"] == ["b2"]


def test_branch_manager_defaults_to_own_branch():
    branches = [Branch(id="b1", network_id="n1", name="א")]
    service, occ, users_repo, _ = _svc(branches=branches)
    actor = ActorContext(
        user_id="bm1", role=roles.BRANCH_MANAGER, network_id="n1", branch_id="b1"
    )

    result = service.team_work_report(actor, branch_id=None, period="today")

    assert result["network_wide"] is False
    assert result["branch_id"] == "b1"
    assert users_repo.list_users.call_args.kwargs["branch_ids"] == ["b1"]


def test_employee_cannot_open_reports():
    service, *_ = _svc()
    actor = ActorContext(
        user_id="e1", role=roles.EMPLOYEE, network_id="n1", branch_id="b1"
    )
    with pytest.raises(PermissionError):
        service.team_work_report(actor, branch_id="b1", period="today")
