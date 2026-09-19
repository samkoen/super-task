from types import SimpleNamespace

from app.domain import roles
from app.domain.task_assignment import can_assign_user_to_branch


def test_oved_needs_branch_membership():
    oved = SimpleNamespace(role=roles.EMPLOYEE, branch_id="b1", network_id="n1")
    assert can_assign_user_to_branch(
        oved, branch_id="b1", membership_branch_ids=["b1"], branch_network_id="n1"
    )
    assert not can_assign_user_to_branch(
        oved, branch_id="b2", membership_branch_ids=["b1"], branch_network_id="n1"
    )


def test_branch_manager_only_in_own_snif():
    menahel = SimpleNamespace(role=roles.BRANCH_MANAGER, branch_id="b1", network_id="n1")
    assert can_assign_user_to_branch(
        menahel, branch_id="b1", membership_branch_ids=[], branch_network_id="n1"
    )
    assert not can_assign_user_to_branch(
        menahel, branch_id="b2", membership_branch_ids=[], branch_network_id="n1"
    )


def test_network_manager_can_be_assigned_in_own_network():
    reshet = SimpleNamespace(role=roles.NETWORK_MANAGER, branch_id=None, network_id="n1")
    assert can_assign_user_to_branch(
        reshet, branch_id="b1", membership_branch_ids=[], branch_network_id="n1"
    )
    assert not can_assign_user_to_branch(
        reshet, branch_id="b1", membership_branch_ids=[], branch_network_id="n2"
    )
