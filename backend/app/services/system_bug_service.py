"""Envoi d'un דיווח תקלה במערכת par e-mail."""
from __future__ import annotations

from html import escape

from app.core.config import APP_NAME, SYSTEM_BUG_EMAIL
from app.domain.scope import ActorContext
from app.domain.system_bug import (
    MAX_AUDIO_BYTES,
    MAX_NOTE_LEN,
    MAX_SCREENSHOT_BYTES,
    has_system_bug_explanation,
    parse_system_bug_emails,
    parse_trail,
    system_bug_subject,
)
from app.services.email_delivery import deliver_html_email

Attachment = tuple[str, bytes]


class SystemBugService:
    def submit(
        self,
        actor: ActorContext,
        *,
        note: str,
        route: str,
        trail_raw: str,
        app_version: str,
        screenshot: bytes | None,
        audio: bytes | None,
        extra: dict[str, str] | None = None,
    ) -> dict:
        note = (note or "").strip()[:MAX_NOTE_LEN]
        audio_bytes = _capped(audio, MAX_AUDIO_BYTES)
        shot = _capped(screenshot, MAX_SCREENSHOT_BYTES)
        if not has_system_bug_explanation(note, has_audio=bool(audio_bytes)):
            raise ValueError("הוסיפו טקסט או הקלטה")
        recipients = parse_system_bug_emails(SYSTEM_BUG_EMAIL)
        if not recipients:
            raise ValueError("יעד הדיווח אינו מוגדר")
        subject = system_bug_subject(route=route, role=actor.role, version=app_version)
        html = _html_body(actor, note, route, parse_trail(trail_raw), app_version, extra or {})
        attachments = _attachments(shot, audio_bytes)
        if not _deliver_to_all(recipients, subject, html, attachments):
            raise RuntimeError("שליחת הדיווח נכשלה")
        return {"ok": True, "subject": subject}


def _deliver_to_all(
    recipients: list[str],
    subject: str,
    html: str,
    attachments: list[Attachment],
) -> bool:
    sent = True
    for to_email in recipients:
        ok = deliver_html_email(
            to_email=to_email,
            subject=subject,
            html_content=html,
            kind="system-bug",
            attachments=attachments,
        )
        sent = sent and ok
    return sent


def _capped(data: bytes | None, limit: int) -> bytes | None:
    if not data:
        return None
    return data if len(data) <= limit else data[:limit]


def _attachments(screenshot: bytes | None, audio: bytes | None) -> list[Attachment]:
    items: list[Attachment] = []
    if screenshot:
        items.append(("screenshot.png", screenshot))
    if audio:
        items.append(("explanation.webm", audio))
    return items


def _html_body(
    actor: ActorContext,
    note: str,
    route: str,
    trail: list[str],
    version: str,
    extra: dict[str, str],
) -> str:
    rows = [
        ("משתמש", f"{actor.user_id}"),
        ("תפקיד", actor.role),
        ("סניף", actor.branch_id or "—"),
        ("רשת", actor.network_id or "—"),
        ("מסך", route or "—"),
        ("מסלול", " → ".join(trail) or "—"),
        ("גרסה", version or "—"),
    ]
    for key, value in extra.items():
        if value:
            rows.append((key, value))
    meta = "".join(
        f"<tr><th align='right'>{escape(k)}</th><td dir='ltr'>{escape(v)}</td></tr>"
        for k, v in rows
    )
    body = escape(note) if note else "—"
    return (
        f"<html><body dir='rtl'><h2>{escape(APP_NAME)} — תקלה במערכת</h2>"
        f"<p>{body}</p><table>{meta}</table></body></html>"
    )
