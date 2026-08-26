from app.domain import roles
from app.domain.view_as import attach_preview_meta, can_view_as_employee


def test_branch_manager_can_view_own_employee():
    assert can_view_as_employee(
        actor_role=roles.BRANCH_MANAGER,
        visible_branch_ids=["s1"],
        target_role=roles.EMPLOYEE,
        target_is_active=True,
        target_branch_ids=["s1"],
    )


def test_branch_manager_cannot_view_other_branch_employee():
    assert not can_view_as_employee(
        actor_role=roles.BRANCH_MANAGER,
        visible_branch_ids=["s1"],
        target_role=roles.EMPLOYEE,
        target_is_active=True,
        target_branch_ids=["s2"],
    )


def test_employee_cannot_view_as_another_employee():
    assert not can_view_as_employee(
        actor_role=roles.EMPLOYEE,
        visible_branch_ids=["s1"],
        target_role=roles.EMPLOYEE,
        target_is_active=True,
        target_branch_ids=["s1"],
    )


def test_inactive_target_rejected():
    assert not can_view_as_employee(
        actor_role=roles.NETWORK_MANAGER,
        visible_branch_ids=["s1", "s2"],
        target_role=roles.EMPLOYEE,
        target_is_active=False,
        target_branch_ids=["s1"],
    )


def test_network_manager_can_view_snif_menahel_as_oved():
    assert can_view_as_employee(
        actor_role=roles.NETWORK_MANAGER,
        visible_branch_ids=["s1", "s2"],
        target_role=roles.BRANCH_MANAGER,
        target_is_active=True,
        target_branch_ids=["s1"],
    )


def test_branch_manager_cannot_view_peer_menahel():
    assert not can_view_as_employee(
        actor_role=roles.BRANCH_MANAGER,
        visible_branch_ids=["s1"],
        target_role=roles.BRANCH_MANAGER,
        target_is_active=True,
        target_branch_ids=["s1"],
    )


def test_cannot_view_as_network_manager():
    assert not can_view_as_employee(
        actor_role=roles.ADMIN,
        visible_branch_ids=None,
        target_role=roles.NETWORK_MANAGER,
        target_is_active=True,
        target_branch_ids=["s1"],
    )


def test_admin_can_view_any_employee():
    assert can_view_as_employee(
        actor_role=roles.ADMIN,
        visible_branch_ids=None,
        target_role=roles.EMPLOYEE,
        target_is_active=True,
        target_branch_ids=["s9"],
    )


def test_attach_preview_meta_keeps_employee_and_real_manager():
    payload = attach_preview_meta(
        {"id": "e1", "role": roles.EMPLOYEE, "full_name": "Oved"},
        {"id": "m1", "role": roles.BRANCH_MANAGER, "full_name": "Menahel"},
    )
    assert payload["id"] == "e1"
    assert payload["is_preview"] is True
    assert payload["preview_real_user"]["id"] == "m1"
    assert payload["preview_real_user"]["role"] == roles.BRANCH_MANAGER
