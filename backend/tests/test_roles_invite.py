import pytest

from app.domain import roles


def test_admin_can_invite_all_staff_roles():
    for target in (roles.NETWORK_MANAGER, roles.BRANCH_MANAGER, roles.EMPLOYEE):
        roles.assert_can_invite(roles.ADMIN, target)


def test_branch_manager_only_invites_employee():
    roles.assert_can_invite(roles.BRANCH_MANAGER, roles.EMPLOYEE)
    with pytest.raises(ValueError):
        roles.assert_can_invite(roles.BRANCH_MANAGER, roles.BRANCH_MANAGER)
