"""Tests UserService — ajout membership multi-snif."""
from unittest.mock import MagicMock

import pytest

from app.domain import roles
from app.domain.scope import ActorContext
from app.models.branch import Branch
from app.models.user import User
from app.services.user_scope_service import UserScopeService
from app.services.user_service import UserService


def _employee(**kwargs) -> User:
    base = dict(
        id="u1",
        email="e@test.com",
        first_name="A",
        last_name="B",
        role=roles.EMPLOYEE,
        phone=None,
        job_function="stockers",
        network_id="n1",
        branch_id="b1",
        is_active=True,
        email_verified=True,
        preferred_language="he",
    )
    base.update(kwargs)
    return User(**base)


def _service(branch: Branch | None = None):
    branch_repo = MagicMock()
    network_repo = MagicMock()
    branch_repo.find_by_id.return_value = branch
    if branch:
        branch_repo.list_branches.return_value = [branch]
    scope = UserScopeService(branch_repo, network_repo)
    repo = MagicMock()
    repo._db = MagicMock()
    return UserService(repo, scope, network_repo, branch_repo)


def test_add_team_employee_branch_ok():
    b1 = Branch(id="b1", network_id="n1", name="מרכז")
    b2 = Branch(id="b2", network_id="n1", name="צפון")
    branch_repo = MagicMock()
    network_repo = MagicMock()
    branch_repo.find_by_id.side_effect = lambda bid: b1 if bid == "b1" else b2 if bid == "b2" else None
    branch_repo.list_branches.return_value = [b1, b2]
    scope = UserScopeService(branch_repo, network_repo)
    repo = MagicMock()
    repo._db = MagicMock()
    service = UserService(repo, scope, network_repo, branch_repo)
    target = _employee()
    service._repo.find_by_id.return_value = target
    service._memberships = MagicMock()
    service._memberships.list_branch_ids_for_user.return_value = ["b1"]
    service._memberships.list_for_user.return_value = [
        {"branch_id": "b1", "branch_name": "מרכז", "is_primary": True},
        {"branch_id": "b2", "branch_name": "צפון", "is_primary": False},
    ]
    actor = ActorContext(
        user_id="m1",
        role=roles.NETWORK_MANAGER,
        network_id="n1",
        branch_id=None,
    )
    out = service.add_team_employee_branch(actor, "u1", branch_id="b2")
    service._memberships.ensure_membership.assert_called_once_with(
        "u1", "b2", is_primary=False
    )
    assert any(b["branch_id"] == "b2" for b in out["branches"])


def test_add_team_employee_branch_permission():
    branch = Branch(id="b2", network_id="n1", name="צפון")
    service = _service(branch)
    service._repo.find_by_id.return_value = _employee(branch_id="other")
    service._memberships = MagicMock()
    service._memberships.list_branch_ids_for_user.return_value = ["other"]
    actor = ActorContext(
        user_id="m1",
        role=roles.BRANCH_MANAGER,
        network_id="n1",
        branch_id="b1",
    )
    with pytest.raises(PermissionError):
        service.add_team_employee_branch(actor, "u1", branch_id="b2")
