"""Envoi d'un modèle WhatsApp via l'API Brevo (jamais d'appel direct à Meta)."""

from __future__ import annotations

import json
import logging
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.integrations.brevo.client import BrevoApiError
from app.integrations.brevo.config import brevo_api_key

logger = logging.getLogger(__name__)

BREVO_WHATSAPP_API_URL = "https://api.brevo.com/v3/whatsapp/sendMessage"


def build_whatsapp_payload(
    *,
    to_number: str,
    sender_number: str,
    template_id: int,
    params: dict[str, str],
) -> dict[str, Any]:
    return {
        "contactNumbers": [to_number],
        "senderNumber": sender_number,
        "templateId": template_id,
        "params": params,
    }


def send_whatsapp_template(
    *,
    to_number: str,
    sender_number: str,
    template_id: int,
    params: dict[str, str],
) -> dict[str, Any]:
    key = brevo_api_key()
    if not key:
        raise BrevoApiError("Brevo : BREVO_API_KEY requis")
    payload = build_whatsapp_payload(
        to_number=to_number,
        sender_number=sender_number,
        template_id=template_id,
        params=params,
    )
    req = Request(
        BREVO_WHATSAPP_API_URL,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        method="POST",
    )
    req.add_header("Accept", "application/json")
    req.add_header("Content-Type", "application/json")
    req.add_header("api-key", key)
    return _read_response(req)


def _read_response(req: Request) -> dict[str, Any]:
    try:
        with urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            if resp.status not in (200, 201, 202):
                raise BrevoApiError(f"Brevo HTTP {resp.status}: {raw[:500]}")
    except HTTPError as e:
        raise _http_error(e) from e
    except URLError as e:
        raise BrevoApiError(f"Brevo réseau: {e.reason}") from e
    return _parse_json(raw)


def _http_error(e: HTTPError) -> BrevoApiError:
    err_body = e.read().decode("utf-8", errors="replace") if e.fp else ""
    msg = err_body[:800]
    try:
        parsed = json.loads(err_body) if err_body else {}
        if isinstance(parsed, dict) and parsed.get("message"):
            msg = str(parsed["message"])
    except json.JSONDecodeError:
        pass
    logger.warning("Brevo WhatsApp HTTP %s: %s", e.code, msg)
    return BrevoApiError(f"Brevo HTTP {e.code}: {msg}")


def _parse_json(raw: str) -> dict[str, Any]:
    try:
        parsed = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        return {"raw": raw}
    return parsed if isinstance(parsed, dict) else {"raw": raw}
