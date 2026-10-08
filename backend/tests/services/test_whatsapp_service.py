from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.domain import roles
from app.domain.scope import ActorContext
from app.domain.whatsapp_outreach import STATUS_SIMULATED, TEMPLATE_KEY
from app.models.user import User
from app.services.whatsapp_delivery import WhatsAppDeliveryResult
from app.services.whatsapp_service import WhatsAppService, delivery_failed


def _actor(role=roles.BRANCH_MANAGER, branch_id="b1", network_id="n1") -> ActorContext:
    return ActorContext(user_id="m1", role=role, network_id=network_id, branch_id=branch_id)


def _employee(**kw) -> User:
    data = dict(
        id="e1", email="e@x.il", first_name="דנה", last_name="כהן",
        role=roles.EMPLOYEE, phone="050-123-4567", branch_id="b1",
    )
    data.update(kw)
    return User(**data)


class _Fixture:
    def __init__(self, deliver_status=STATUS_SIMULATED, error=None):
        self.users = MagicMock()
        self.branches = MagicMock()
        self.branches.list_branches.return_value = [SimpleNamespace(id="b1")]
        self.memberships = MagicMock()
        self.memberships.list_branch_ids_for_user.return_value = []
        self.messages = MagicMock()
        self.messages.create.side_effect = lambda **kw: SimpleNamespace(**kw)
        self.deliver = MagicMock(
            return_value=WhatsAppDeliveryResult(status=deliver_status, error=error)
        )
        self.service = WhatsAppService(
            self.messages, self.users, self.branches, self.memberships, deliver=self.deliver
        )

    def send(self, actor=None, **overrides):
        args = dict(
            recipient_user_id="e1", phone=None, recipient_name=None,
            text_key="call_me", consent_confirmed=True,
        )
        args.update(overrides)
        return self.service.send(actor or _actor(), **args)


def test_employee_role_cannot_send():
    fx = _Fixture()
    with pytest.raises(PermissionError):
        fx.send(_actor(role=roles.EMPLOYEE))
    fx.deliver.assert_not_called()
    fx.messages.create.assert_not_called()


def test_send_to_employee_fills_template_variables():
    fx = _Fixture()
    fx.users.find_by_id.return_value = _employee()
    msg = fx.send()
    fx.deliver.assert_called_once()
    kwargs = fx.deliver.call_args.kwargs
    assert kwargs["to_number"] == "972501234567"
    assert kwargs["variables"]["NAME"] == "דנה כהן"
    assert kwargs["variables"]["MESSAGE"]
    saved = fx.messages.create.call_args.kwargs
    assert saved["sent_by_user_id"] == "m1"
    assert saved["recipient_user_id"] == "e1"
    assert saved["template_key"] == TEMPLATE_KEY
    assert saved["consent_confirmed"] is True
    assert msg.status == STATUS_SIMULATED


def test_external_number_is_not_a_super_user():
    fx = _Fixture()
    fx.send(recipient_user_id=None, phone="0521112222", recipient_name="יוסי")
    fx.users.find_by_id.assert_not_called()
    saved = fx.messages.create.call_args.kwargs
    assert saved["recipient_user_id"] is None
    assert saved["recipient_phone"] == "972521112222"
    assert saved["variables"]["NAME"] == "יוסי"


def test_invalid_number_rejected_before_delivery():
    fx = _Fixture()
    with pytest.raises(ValueError, match="מספר וואטסאפ לא תקין"):
        fx.send(recipient_user_id=None, phone="123", recipient_name="יוסי")
    fx.deliver.assert_not_called()
    fx.messages.create.assert_not_called()


def test_missing_consent_rejected():
    fx = _Fixture()
    fx.users.find_by_id.return_value = _employee()
    with pytest.raises(ValueError):
        fx.send(consent_confirmed=False)
    fx.deliver.assert_not_called()


def test_employee_without_phone_rejected():
    fx = _Fixture()
    fx.users.find_by_id.return_value = _employee(phone=None)
    with pytest.raises(ValueError):
        fx.send()
    fx.deliver.assert_not_called()


def test_employee_outside_manager_scope_rejected():
    fx = _Fixture()
    fx.users.find_by_id.return_value = _employee(branch_id="other")
    with pytest.raises(PermissionError):
        fx.send()
    fx.deliver.assert_not_called()


def test_admin_can_reach_any_employee():
    fx = _Fixture()
    fx.users.find_by_id.return_value = _employee(branch_id="other")
    fx.send(_actor(role=roles.ADMIN, branch_id=None, network_id=None))
    fx.deliver.assert_called_once()


def test_non_employee_target_rejected():
    fx = _Fixture()
    fx.users.find_by_id.return_value = _employee(role=roles.BRANCH_MANAGER)
    with pytest.raises(PermissionError):
        fx.send()


def test_user_and_phone_together_rejected():
    fx = _Fixture()
    with pytest.raises(ValueError):
        fx.send(phone="0501234567")


def test_unknown_text_key_rejected():
    fx = _Fixture()
    fx.users.find_by_id.return_value = _employee()
    with pytest.raises(ValueError):
        fx.send(text_key="texte libre")
    fx.deliver.assert_not_called()


def test_failed_delivery_is_persisted_and_flagged():
    fx = _Fixture(deliver_status="failed", error="Brevo HTTP 400")
    fx.users.find_by_id.return_value = _employee()
    msg = fx.send()
    assert fx.messages.create.call_args.kwargs["error"] == "Brevo HTTP 400"
    assert delivery_failed(msg)
