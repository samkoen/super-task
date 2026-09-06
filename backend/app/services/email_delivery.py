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


def _as_emails(to_email: str | list[str]) -> list[str]:
    items = [to_email] if isinstance(to_email, str) else list(to_email or [])
    emails: list[str] = []
    seen: set[str] = set()
    for item in items:
        email = (item or "").strip()
        key = email.lower()
        if not email or key in seen:
            continue
        seen.add(key)
        emails.append(email)
    return emails


def deliver_html_email(
    *,
    to_email: str | list[str],
    subject: str,
    html_content: str,
    kind: str,
    attachments: list[tuple[str, bytes]] | None = None,
    allow_simulation: bool = True,
) -> bool:
    orig = _as_emails(to_email)
    if not orig:
        logger.error("[email:%s] Destinataire vide", kind)
        return False
    targets, sandbox = _delivery_targets(orig, allow_simulation)
    if sandbox and allow_simulation and not brevo_sandbox_recipient().strip():
        return _log_simulation(orig, orig, True, subject, html_content, kind, attachments)
    if not targets:
        logger.error("[email:%s] Sandbox sans destinataire", kind)
        return False
    if brevo_credentials_ok():
        return _send_via_brevo(orig, targets, sandbox, subject, html_content, kind, attachments)
    if allow_simulation:
        return _log_simulation(orig, targets, sandbox, subject, html_content, kind, attachments)
    logger.error("[email:%s] Brevo requis, simulation interdite", kind)
    return False


def _delivery_targets(orig: list[str], allow_simulation: bool) -> tuple[list[str], bool]:
    if allow_simulation and brevo_force_simulation():
        sandbox_to = brevo_sandbox_recipient().strip()
        return ([sandbox_to] if sandbox_to else orig), True
    return orig, False


def _send_via_brevo(
    orig_to: list[str],
    recipients: list[str],
    sandbox: bool,
    subject: str,
    html_content: str,
    kind: str,
    attachments: list[tuple[str, bytes]] | None = None,
) -> bool:
    try:
        resp = send_transactional_html_email(
            to_email=recipients,
            subject=subject,
            html_content=html_content,
            attachments=attachments,
        )
        mid = resp.get("messageId") or resp.get("message_id") if isinstance(resp, dict) else None
        mode = "Brevo sandbox" if sandbox else "Brevo"
        asked = ", ".join(orig_to)
        dest = ", ".join(recipients)
        extra = f" (demande: {asked})" if sandbox and asked.lower() != dest.lower() else ""
        _safe_print(f"\n--- E-mail {mode} ({kind}) -> {dest}{extra} | ID: {mid or '-'}\n")
        return True
    except BrevoApiError as e:
        logger.error("[email:brevo] Échec %s (%s): %s", kind, ", ".join(orig_to), e)
        return False


def _log_simulation(
    orig_to: list[str],
    recipients: list[str],
    sandbox: bool,
    subject: str,
    html_content: str,
    kind: str,
    attachments: list[tuple[str, bytes]] | None = None,
) -> bool:
    mode = "SIMULATION" if sandbox else "SIMULATION (Brevo non configuré)"
    asked = ", ".join(orig_to)
    dest = ", ".join(recipients)
    _safe_print(f"\n--- E-mail {mode} ({kind}) ---")
    _safe_print(f"To: {dest}" + (f" (demande: {asked})" if asked != dest else ""))
    _safe_print(f"Subject: {subject}")
    if attachments:
        names = ", ".join(name for name, _ in attachments)
        _safe_print(f"Attachments: {names}")
    match = re.search(r'href="([^"]+(?:verify-email|accept-invite)[^"]*)"', html_content)
    if match:
        _safe_print(f"Link: {match.group(1)}")
    _safe_print("---\n")
    logger.info("[email:simulation %s] %s -> %s", kind, asked, dest)
    return True
