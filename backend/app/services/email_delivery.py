"""Livraison d'e-mails (Brevo ou simulation / logs en dev)."""

from __future__ import annotations

import logging
import re
import sys

from app.integrations.brevo import BrevoApiError, brevo_credentials_ok, send_transactional_html_email
from app.integrations.brevo.config import brevo_force_simulation, brevo_sandbox_recipient

logger = logging.getLogger(__name__)


def _safe_print(text: str) -> None:
    """Affiche sur stdout sans planter sous Windows (cp1252)."""
    try:
        print(text)
    except UnicodeEncodeError:
        encoding = getattr(sys.stdout, "encoding", None) or "utf-8"
        sys.stdout.buffer.write((text + "\n").encode(encoding, errors="replace"))
        sys.stdout.buffer.flush()


def _resolve_recipient(to_email: str) -> tuple[str, str, bool]:
    orig = (to_email or "").strip()
    sandbox = brevo_force_simulation()
    if sandbox:
        recipient = brevo_sandbox_recipient().strip() or orig
        return orig, recipient, True
    return orig, orig, False


def deliver_html_email(
    *,
    to_email: str,
    subject: str,
    html_content: str,
    kind: str,
) -> bool:
    orig_to, recipient, sandbox = _resolve_recipient(to_email)
    if not orig_to:
        logger.error("[email:%s] Destinataire vide", kind)
        return False

    if sandbox and not brevo_sandbox_recipient().strip():
        return _log_simulation(orig_to, orig_to, True, subject, html_content, kind)

    if not recipient:
        logger.error("[email:%s] Sandbox sans destinataire", kind)
        return False

    if brevo_credentials_ok():
        return _send_via_brevo(orig_to, recipient, sandbox, subject, html_content, kind)

    return _log_simulation(orig_to, recipient, sandbox, subject, html_content, kind)


def _send_via_brevo(
    orig_to: str,
    recipient: str,
    sandbox: bool,
    subject: str,
    html_content: str,
    kind: str,
) -> bool:
    try:
        resp = send_transactional_html_email(
            to_email=recipient,
            subject=subject,
            html_content=html_content,
        )
        mid = resp.get("messageId") or resp.get("message_id") if isinstance(resp, dict) else None
        mode = "Brevo sandbox" if sandbox else "Brevo"
        extra = f" (demande: {orig_to})" if sandbox and orig_to.lower() != recipient.lower() else ""
        _safe_print(f"\n--- E-mail {mode} ({kind}) -> {recipient}{extra} | ID: {mid or '-'}\n")
        return True
    except BrevoApiError as e:
        logger.error("[email:brevo] Échec %s (%s): %s", kind, orig_to, e)
        return False


def _log_simulation(
    orig_to: str,
    recipient: str,
    sandbox: bool,
    subject: str,
    html_content: str,
    kind: str,
) -> bool:
    mode = "SIMULATION" if sandbox else "SIMULATION (Brevo non configuré)"
    _safe_print(f"\n--- E-mail {mode} ({kind}) ---")
    _safe_print(f"To: {recipient}" + (f" (demande: {orig_to})" if orig_to != recipient else ""))
    _safe_print(f"Subject: {subject}")
    match = re.search(r'href="([^"]+(?:verify-email|accept-invite)[^"]*)"', html_content)
    if match:
        _safe_print(f"Link: {match.group(1)}")
    _safe_print("---\n")
    logger.info("[email:simulation %s] %s -> %s", kind, orig_to, recipient)
    return True
