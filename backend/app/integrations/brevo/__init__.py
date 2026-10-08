"""Intégration Brevo (e-mails transactionnels et WhatsApp)."""

from app.integrations.brevo.client import BrevoApiError, send_transactional_html_email
from app.integrations.brevo.config import (
    brevo_credentials_ok,
    brevo_is_configured,
    brevo_whatsapp_credentials_ok,
)
from app.integrations.brevo.whatsapp_client import send_whatsapp_template

__all__ = [
    "BrevoApiError",
    "brevo_credentials_ok",
    "brevo_is_configured",
    "brevo_whatsapp_credentials_ok",
    "send_transactional_html_email",
    "send_whatsapp_template",
]
