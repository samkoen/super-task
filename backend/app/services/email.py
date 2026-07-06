"""Service e-mail — inscription (vérification) via Brevo."""

from __future__ import annotations

import logging

from app.core import config
from app.core.security import create_email_verification_token, create_invitation_token
from app.services.email_delivery import deliver_html_email
from app.services.email_templates import invitation_email_html, verification_email_html
from app.domain import job_functions, roles

logger = logging.getLogger(__name__)


def build_verification_url(user_id: str) -> str:
    token = create_email_verification_token(user_id)
    base = config.FRONTEND_URL.rstrip("/")
    return f"{base}/verify-email?token={token}"


def send_verification_email(email: str, user_id: str, full_name: str) -> bool:
    verify_url = build_verification_url(user_id)
    subject = f"{config.APP_NAME} — אימות אימייל"
    html = verification_email_html(
        app_name=config.APP_NAME,
        full_name=full_name,
        verify_url=verify_url,
    )
    ok = deliver_html_email(
        to_email=email,
        subject=subject,
        html_content=html,
        kind="register_verify",
    )
    if not ok:
        logger.warning("Échec envoi e-mail vérification pour user_id=%s", user_id)
    return ok


def build_invitation_url(invitation_id: str) -> str:
    token = create_invitation_token(invitation_id)
    base = config.FRONTEND_URL.rstrip("/")
    return f"{base}/accept-invite?token={token}"


def send_invitation_email(
    email: str,
    invitation_id: str,
    role: str,
    job_function: str | None,
) -> bool:
    invite_url = build_invitation_url(invitation_id)
    role_label = roles.ROLE_LABELS_HE.get(role, role)
    job_label = job_functions.JOB_FUNCTION_LABELS_HE.get(job_function or "", "") or None
    subject = f"{config.APP_NAME} — הזמנה להצטרפות"
    html = invitation_email_html(
        app_name=config.APP_NAME,
        invite_url=invite_url,
        role_label=role_label,
        job_function_label=job_label,
    )
    ok = deliver_html_email(
        to_email=email,
        subject=subject,
        html_content=html,
        kind="user_invite",
    )
    if not ok:
        logger.warning("Échec envoi e-mail invitation id=%s", invitation_id)
    return ok
