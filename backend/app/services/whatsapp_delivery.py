"""Livraison WhatsApp via Brevo, ou simulation (journal uniquement)."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from app.domain.whatsapp_outreach import STATUS_FAILED, STATUS_SENT, STATUS_SIMULATED
from app.integrations.brevo import BrevoApiError, send_whatsapp_template
from app.integrations.brevo.config import (
    brevo_force_simulation,
    brevo_whatsapp_credentials_ok,
    brevo_whatsapp_sender_number,
    brevo_whatsapp_template_id,
)

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class WhatsAppDeliveryResult:
    status: str
    brevo_message_id: str | None = None
    error: str | None = None


def deliver_whatsapp_template(
    *, to_number: str, variables: dict[str, str]
) -> WhatsAppDeliveryResult:
    if brevo_force_simulation() or not brevo_whatsapp_credentials_ok():
        logger.info("[whatsapp:simulation] -> %s %s", to_number, variables)
        return WhatsAppDeliveryResult(status=STATUS_SIMULATED)
    try:
        resp = send_whatsapp_template(
            to_number=to_number,
            sender_number=brevo_whatsapp_sender_number() or "",
            template_id=brevo_whatsapp_template_id() or 0,
            params=variables,
        )
    except BrevoApiError as e:
        logger.error("[whatsapp:brevo] Échec -> %s: %s", to_number, e)
        return WhatsAppDeliveryResult(status=STATUS_FAILED, error=str(e)[:500])
    message_id = resp.get("messageId")
    return WhatsAppDeliveryResult(
        status=STATUS_SENT, brevo_message_id=str(message_id) if message_id else None
    )
