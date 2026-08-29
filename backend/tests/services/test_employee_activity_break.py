from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest

from app.domain import roles
from app.domain.notification_rules import SOUND_NONE
from app.domain.scope import ActorContext
from app.models.user import User
from app.services.employee_activity_service import EmployeeActivityService
from app.services.notification_service import NotificationService

UID = "11111111-1111-1111-1111-111111111111"


def _svc(row) -> EmployeeActivityService:
    users = MagicMock()
    users._db = MagicMock()
    users._db.get.return_value = row
    return EmployeeActivityService(users, MagicMock())


def _employee(**kwargs) -> User:
    defaults = dict(
        id="e1",
        email="e@x.com",
        first_name="דן",
        last_name="כהן",
        role=roles.EMPLOYEE,
        network_id="n1",
        branch_id="b1",
    )
    defaults.update(kwargs)
    return User(**defaults)


def test_branch_manager_can_set_break():
    row = MagicMock(role=roles.BRANCH_MANAGER, on_break_since=None)
    breaks = MagicMock()
    svc = _svc(row)
    svc._breaks = breaks
    result = svc.set_break(UID, on_break=True)
    assert result["on_break"] is True
    breaks.open_interval.assert_called_once()


def test_end_break_closes_open_interval():
    row = MagicMock(role=roles.EMPLOYEE, on_break_since=datetime.now())
    breaks = MagicMock()
    svc = _svc(row)
    svc._breaks = breaks
    svc._has_in_progress = MagicMock(return_value=True)
    result = svc.set_break(UID, on_break=False)
    assert result["on_break"] is False
    breaks.close_open.assert_called_once()


def test_network_manager_cannot_set_break():
    row = MagicMock(role=roles.NETWORK_MANAGER, on_break_since=None)
    with pytest.raises(PermissionError):
        _svc(row).set_break(UID, on_break=True)


def test_oved_cannot_ring_on_break():
    svc = _svc(MagicMock(role=roles.EMPLOYEE))
    actor = ActorContext(UID, roles.EMPLOYEE, "n1", "b1")
    with pytest.raises(PermissionError):
        svc.ring_on_break(actor, UID)


def test_ring_on_break_rejects_when_not_on_break():
    users = MagicMock()
    users.find_by_id.return_value = _employee()
    users.on_break_since.return_value = None
    svc = EmployeeActivityService(users, MagicMock(), MagicMock())
    actor = ActorContext("m1", roles.BRANCH_MANAGER, "n1", "b1")
    with pytest.raises(ValueError):
        svc.ring_on_break(actor, "e1")


def test_ring_on_break_publishes_emergency():
    users = MagicMock()
    users.find_by_id.return_value = _employee()
    users.on_break_since.return_value = datetime.now(timezone.utc)
    notif = MagicMock()
    notif.create.return_value = MagicMock(id="n1")
    svc = EmployeeActivityService(users, MagicMock(), notif)
    actor = ActorContext("m1", roles.BRANCH_MANAGER, "n1", "b1")
    result = svc.ring_on_break(actor, "e1")
    assert result["ok"] is True
    assert result["recipient_break"]["on_break"] is True
    notif.create.assert_called_once()
    assert notif.create.call_args.kwargs["kind"] == "break_override"


def test_publish_direct_chat_mutes_employee_on_break():
    repo = MagicMock()
    repo.create.return_value = MagicMock(id="n1")
    users = MagicMock()
    users.find_by_id.return_value = MagicMock(role=roles.EMPLOYEE, is_active=True)
    users.on_break_since.return_value = datetime.now(timezone.utc)
    pending = NotificationService(repo, users).publish_direct_chat(
        recipient_ids={"e1"},
        branch_id="b1",
        preview="שלום",
    )
    assert pending[0][3] == SOUND_NONE


def test_publish_break_ring_keeps_sound():
    repo = MagicMock()
    repo.create.return_value = MagicMock(id="n1")
    users = MagicMock()
    users.find_by_id.return_value = MagicMock(role=roles.EMPLOYEE, is_active=True)
    users.on_break_since.return_value = datetime.now(timezone.utc)
    pending = NotificationService(repo, users).publish_break_ring(user_id="e1", branch_id="b1")
    assert pending[0][2] == "break_override"
    assert pending[0][3] != SOUND_NONE
