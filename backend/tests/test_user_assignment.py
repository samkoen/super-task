import pytest

from app.domain import roles
from app.domain.user_assignment import UserScope, apply_inviter_defaults, resolve_user_scope


def test_network_manager_requires_network():
    scope = resolve_user_scope(roles.NETWORK_MANAGER, network_id="r1", branch_id=None)
    assert scope == UserScope("r1", None)


def test_employee_requires_branch():
    scope = resolve_user_scope(
        roles.EMPLOYEE, network_id=None, branch_id="s1", branch_network_id="r1"
    )
    assert scope == UserScope("r1", "s1")


def test_branch_manager_inviter_auto_branch_for_employee():
    network_id, branch_id = apply_inviter_defaults(
        roles.EMPLOYEE,
        network_id=None,
        branch_id=None,
        inviter_role=roles.BRANCH_MANAGER,
        inviter_network_id="r1",
        inviter_branch_id="s1",
    )
    assert network_id == "r1"
    assert branch_id == "s1"


def test_employee_without_branch_raises():
    with pytest.raises(ValueError, match="נדרש לבחור סניף"):
        resolve_user_scope(roles.EMPLOYEE, network_id=None, branch_id=None)
