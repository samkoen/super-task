from unittest.mock import MagicMock, patch

import pytest

from app.domain import roles
from app.domain.scope import ActorContext
from app.models.user import User
from app.services.view_as_service import ViewAsService


def _employee(**overrides):
    base = dict(
        id="e1",
        email="emp@test.com",
        first_name="Oved",
        last_name="One",
        role=roles.EMPLOYEE,
        network_id="r1",
        branch_id="s1",
        is_active=True,
    )
    base.update(overrides)
    return User(**base)


def _service(target: User, *, visible=None, member_ids=None):
    users = MagicMock()
    users.find_by_id.return_value = target
    service = ViewAsService(users)
    service._memberships = MagicMock()
    service._memberships.list_branch_ids_for_user.return_value = member_ids or [target.branch_id]
    service._auth = MagicMock()
    service._auth.get_user_by_id.return_value = {"id": target.id, "role": target.role}
    return service, visible


def test_start_returns_employee_payload_for_own_branch():
    target = _employee()
    service, _ = _service(target)
    actor = ActorContext(
        user_id="m1", role=roles.BRANCH_MANAGER, network_id="r1", branch_id="s1"
    )
    with patch(
        "app.services.view_as_service.visible_branch_ids_for_tasks",
        return_value=["s1"],
    ):
        payload = service.start(actor, "e1")
    assert payload["id"] == "e1"


def test_start_rejects_other_branch_employee():
    target = _employee(branch_id="s2")
    service, _ = _service(target, member_ids=["s2"])
    actor = ActorContext(
        user_id="m1", role=roles.BRANCH_MANAGER, network_id="r1", branch_id="s1"
    )
    with patch(
        "app.services.view_as_service.visible_branch_ids_for_tasks",
        return_value=["s1"],
    ):
        with pytest.raises(PermissionError):
            service.start(actor, "e1")


def test_start_rejects_missing_user():
    users = MagicMock()
    users.find_by_id.return_value = None
    service = ViewAsService(users)
    actor = ActorContext(user_id="m1", role=roles.BRANCH_MANAGER, branch_id="s1")
    with pytest.raises(ValueError, match="לא נמצא"):
        service.start(actor, "missing")


def test_start_allows_network_manager_to_view_snif_menahel():
    target = _employee(id="m2", role=roles.BRANCH_MANAGER)
    service, _ = _service(target)
    actor = ActorContext(user_id="nm", role=roles.NETWORK_MANAGER, network_id="r1")
    with patch(
        "app.services.view_as_service.visible_branch_ids_for_tasks",
        return_value=["s1"],
    ):
        payload = service.start(actor, "m2")
    assert payload["id"] == "m2"
    assert payload["role"] == roles.BRANCH_MANAGER
