"""Envoi d'e-mails transactionnels via l'API Brevo."""

from __future__ import annotations

import base64
import json
import logging
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.integrations.brevo.config import (
    brevo_api_key,
    brevo_sender_email,
    brevo_sender_name,
)

logger = logging.getLogger(__name__)

BREVO_SMTP_API_URL = "https://api.brevo.com/v3/smtp/email"


class BrevoApiError(Exception):
    """Erreur HTTP ou réponse inattendue de l'API Brevo."""


def send_transactional_html_email(
    *,
    to_email: str | list[str],
    subject: str,
    html_content: str,
    attachments: list[tuple[str, bytes]] | None = None,
) -> dict[str, Any]:
    key = brevo_api_key()
    sender = brevo_sender_email()
    if not key or not sender:
        raise BrevoApiError("Brevo : BREVO_API_KEY et BREVO_SENDER_EMAIL requis")

    to_addrs = _normalize_to(to_email)
    if not to_addrs:
        raise BrevoApiError("Destinataire vide")

    payload: dict[str, Any] = {
        "sender": {"name": brevo_sender_name(), "email": sender},
        "to": [{"email": addr} for addr in to_addrs],
        "subject": (subject or "").strip() or "(sans objet)",
        "htmlContent": html_content or "<p></p>",
    }
    if attachments:
        payload["attachment"] = [
            _brevo_attachment(name, data) for name, data in attachments if data
        ]

    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = Request(BREVO_SMTP_API_URL, data=body, method="POST")
    req.add_header("Accept", "application/json")
    req.add_header("Content-Type", "application/json")
    req.add_header("api-key", key)

    try:
        with urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            if resp.status not in (200, 201, 202):
                raise BrevoApiError(f"Brevo HTTP {resp.status}: {raw[:500]}")
    except HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace") if e.fp else ""
        msg = err_body[:800]
        try:
            parsed = json.loads(err_body) if err_body else {}
            if isinstance(parsed, dict) and parsed.get("message"):
                msg = str(parsed.get("message"))
        except json.JSONDecodeError:
            pass
        logger.warning("Brevo HTTP %s: %s", e.code, msg)
        raise BrevoApiError(f"Brevo HTTP {e.code}: {msg}") from e
    except URLError as e:
        raise BrevoApiError(f"Brevo réseau: {e.reason}") from e

    try:
        return json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        return {"raw": raw}


def _brevo_attachment(name: str, data: bytes) -> dict[str, str]:
    row = {"name": name, "content": base64.b64encode(data).decode("ascii")}
    if name.startswith("screenshot."):
        row["contentId"] = "bug-screenshot"
    return row


def _normalize_to(to_email: str | list[str]) -> list[str]:
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
