"""Règles pures pour l'envoi WhatsApp (modèle Brevo pré-approuvé, sans texte libre)."""
from __future__ import annotations

import re

from app.domain.phone_login import strip_bidi
from app.domain.scope import ActorContext
from app.domain.task_scope import can_manage_tasks

TEMPLATE_KEY = "manager_contact"
VAR_NAME = "NAME"
VAR_MESSAGE = "MESSAGE"

STATUS_SENT = "sent"
STATUS_SIMULATED = "simulated"
STATUS_FAILED = "failed"

MAX_NAME_LENGTH = 60

SHORT_TEXTS: dict[str, str] = {
    "call_me": "נא ליצור איתי קשר",
    "open_app": "יש עדכון חדש עבורך באפליקציית סופר",
    "come_to_branch": "נא להגיע לסניף",
}

_ISRAEL_MOBILE = re.compile(r"^0(5\d)(\d{7})$")
_ISRAEL_INTL = re.compile(r"^972(5\d)(\d{7})$")
_SEPARATORS = re.compile(r"[\s\-().]")
_CONTROL = re.compile(r"[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\ufeff]")

INVALID_NUMBER = "מספר וואטסאפ לא תקין"


def assert_can_send(actor: ActorContext) -> None:
    if not can_manage_tasks(actor):
        raise PermissionError("אין הרשאה לשלוח הודעת וואטסאפ")


def normalize_whatsapp_number(raw: str | None) -> str:
    """Retourne les chiffres au format Brevo (972… pour Israël, sinon E.164 sans +)."""
    text = _SEPARATORS.sub("", strip_bidi(raw or ""))
    international = text.startswith("+") or text.startswith("00")
    digits = re.sub(r"\D", "", text)
    if text.startswith("00"):
        digits = digits[2:]
    if _ISRAEL_MOBILE.match(digits):
        return "972" + digits[1:]
    if _ISRAEL_INTL.match(digits):
        return digits
    if international and 8 <= len(digits) <= 15 and not digits.startswith(("0", "972")):
        return digits
    raise ValueError(INVALID_NUMBER)


def clean_recipient_name(raw: str | None) -> str:
    name = _CONTROL.sub("", raw or "").strip()
    if not name:
        raise ValueError("יש להזין שם נמען")
    if len(name) > MAX_NAME_LENGTH:
        raise ValueError("שם הנמען ארוך מדי")
    return name


def resolve_short_text(text_key: str | None) -> str:
    text = SHORT_TEXTS.get((text_key or "").strip())
    if not text:
        raise ValueError("הודעה לא מוכרת")
    return text


def build_template_variables(name: str, text_key: str | None) -> dict[str, str]:
    return {VAR_NAME: clean_recipient_name(name), VAR_MESSAGE: resolve_short_text(text_key)}


def require_consent(confirmed: object) -> None:
    if confirmed is not True:
        raise ValueError("יש לאשר שהנמען הסכים לקבל הודעת וואטסאפ")


def employee_in_actor_scope(
    visible_branch_ids: list[str] | None, employee_branch_ids: list[str]
) -> bool:
    """`visible_branch_ids` None = accès global (admin)."""
    if visible_branch_ids is None:
        return True
    return any(b in visible_branch_ids for b in employee_branch_ids)
