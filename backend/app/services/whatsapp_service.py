"""Envoi WhatsApp (modèle Brevo pré-approuvé) par un menahel ou un admin."""
from __future__ import annotations

from dataclasses import dataclass

from app.domain import roles
from app.domain.scope import ActorContext
from app.domain.task_scope import visible_branch_ids_for_tasks
from app.domain.whatsapp_outreach import (
    STATUS_FAILED,
    TEMPLATE_KEY,
    assert_can_send,
    build_template_variables,
    employee_in_actor_scope,
    normalize_whatsapp_number,
    require_consent,
)
from app.models.whatsapp_message import WhatsAppMessage
from app.repositories.branch_repository import BranchRepository
from app.repositories.user_branch_membership_repository import UserBranchMembershipRepository
from app.repositories.user_repository import UserRepository
from app.repositories.whatsapp_message_repository import WhatsAppMessageRepository
from app.services.whatsapp_delivery import WhatsAppDeliveryResult, deliver_whatsapp_template


@dataclass(frozen=True)
class _Recipient:
    user_id: str | None
    name: str
    raw_phone: str | None


class WhatsAppService:
    def __init__(
        self,
        messages: WhatsAppMessageRepository,
        users: UserRepository,
        branches: BranchRepository,
        memberships: UserBranchMembershipRepository,
        deliver=deliver_whatsapp_template,
    ):
        self._messages = messages
        self._users = users
        self._branches = branches
        self._memberships = memberships
        self._deliver = deliver

    def send(
        self,
        actor: ActorContext,
        *,
        recipient_user_id: str | None,
        phone: str | None,
        recipient_name: str | None,
        text_key: str | None,
        consent_confirmed: object,
    ) -> WhatsAppMessage:
        assert_can_send(actor)
        require_consent(consent_confirmed)
        recipient = self._resolve_recipient(actor, recipient_user_id, phone, recipient_name)
        number = normalize_whatsapp_number(recipient.raw_phone)
        variables = build_template_variables(recipient.name, text_key)
        result = self._deliver(to_number=number, variables=variables)
        return self._record(actor, recipient, number, variables, result)

    def _resolve_recipient(
        self,
        actor: ActorContext,
        recipient_user_id: str | None,
        phone: str | None,
        recipient_name: str | None,
    ) -> _Recipient:
        if recipient_user_id and (phone or "").strip():
            raise ValueError("יש לבחור עובד או מספר חיצוני, לא את שניהם")
        if recipient_user_id:
            return self._employee_recipient(actor, recipient_user_id)
        return _Recipient(user_id=None, name=recipient_name or "", raw_phone=phone)

    def _employee_recipient(self, actor: ActorContext, user_id: str) -> _Recipient:
        target = self._users.find_by_id(user_id)
        if not target:
            raise ValueError("עובד לא נמצא")
        if target.role != roles.EMPLOYEE:
            raise PermissionError("ניתן לשלוח רק לעובדים")
        self._assert_employee_in_scope(actor, target)
        if not (target.phone or "").strip():
            raise ValueError("לעובד אין מספר טלפון")
        return _Recipient(user_id=target.id, name=target.full_name, raw_phone=target.phone)

    def _assert_employee_in_scope(self, actor: ActorContext, target) -> None:
        member_ids = self._memberships.list_branch_ids_for_user(target.id)
        if target.branch_id and target.branch_id not in member_ids:
            member_ids = [target.branch_id, *member_ids]
        visible = visible_branch_ids_for_tasks(actor, self._branches)
        if not employee_in_actor_scope(visible, member_ids):
            raise PermissionError("אין הרשאה לשלוח לעובד זה")

    def _record(
        self,
        actor: ActorContext,
        recipient: _Recipient,
        number: str,
        variables: dict[str, str],
        result: WhatsAppDeliveryResult,
    ) -> WhatsAppMessage:
        return self._messages.create(
            sent_by_user_id=actor.user_id,
            recipient_user_id=recipient.user_id,
            recipient_name=recipient.name,
            recipient_phone=number,
            template_key=TEMPLATE_KEY,
            variables=variables,
            brevo_message_id=result.brevo_message_id,
            status=result.status,
            error=result.error,
            consent_confirmed=True,
        )


def delivery_failed(message: WhatsAppMessage) -> bool:
    return message.status == STATUS_FAILED
