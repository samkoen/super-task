"""Envoi d'un דיווח תקלה במערכת par e-mail (+ issue GitHub)."""
from __future__ import annotations

import logging
from html import escape

from app.core.config import APP_NAME, SYSTEM_BUG_EMAIL
from app.domain.media_compression import compress_photo_bytes
from app.domain.scope import ActorContext
from app.domain.system_bug import (
    MAX_NOTE_LEN,
    SystemBugIdentity,
    has_system_bug_explanation,
    mail_safe_audio_attachment,
    parse_trail,
    system_bug_issue_body,
    system_bug_meta_rows,
    system_bug_recipients,
    system_bug_subject,
)
from app.integrations.github import create_system_bug_issue, github_issues_enabled
from app.repositories.branch_repository import BranchRepository
from app.repositories.user_repository import UserRepository
from app.services.email_delivery import deliver_html_email

Attachment = tuple[str, bytes]
logger = logging.getLogger(__name__)


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
        identity: SystemBugIdentity,
        extra: dict[str, str] | None = None,
    ) -> dict:
        note = (note or "").strip()[:MAX_NOTE_LEN]
        has_audio = bool(audio)
        shot, shot_name = _prepare_screenshot(screenshot)
        if not has_system_bug_explanation(note, has_audio=has_audio):
            raise ValueError("הוסיפו טקסט או הקלטה")
        recipients = system_bug_recipients(SYSTEM_BUG_EMAIL)
        if not recipients:
            raise ValueError("יעד הדיווח אינו מוגדר")
        subject = system_bug_subject(route=route, role=actor.role, version=app_version)
        trail = parse_trail(trail_raw)
        extra = extra or {}
        audio_file = mail_safe_audio_attachment(audio)
        html = _html_body(
            identity,
            actor.role,
            note,
            route,
            trail,
            app_version,
            extra,
            bool(shot),
            audio_file[0] if audio_file else None,
            has_audio,
        )
        if not _deliver_to_all(
            recipients, subject, html, _mail_attachments(shot, shot_name, audio_file)
        ):
            raise RuntimeError("שליחת הדיווח נכשלה")
        return _submit_ok(
            actor, identity, subject, note, route, trail, app_version, extra, shot, has_audio
        )


def resolve_system_bug_identity(
    actor: ActorContext,
    user_repo: UserRepository,
    branch_repo: BranchRepository,
    *,
    branch_name_hint: str = "",
) -> SystemBugIdentity:
    user = user_repo.find_by_id(actor.user_id)
    return SystemBugIdentity(
        user_name=(user.full_name if user else "").strip(),
        branch_name=_branch_display_name(actor.branch_id, branch_repo, branch_name_hint),
        network_name=_network_display_name(actor.network_id, branch_repo),
    )


def _branch_display_name(
    branch_id: str | None,
    branch_repo: BranchRepository,
    hint: str,
) -> str:
    if branch_id:
        branch = branch_repo.find_by_id(branch_id)
        name = (branch.name if branch else "").strip()
        if name:
            return name
    return (hint or "").strip()


def _network_display_name(network_id: str | None, branch_repo: BranchRepository) -> str:
    if not network_id:
        return ""
    try:
        return (branch_repo.get_network_name(network_id) or "").strip()
    except ValueError:
        return ""


def _submit_ok(
    actor: ActorContext,
    identity: SystemBugIdentity,
    subject: str,
    note: str,
    route: str,
    trail: list[str],
    version: str,
    extra: dict[str, str],
    screenshot: bytes | None,
    has_audio: bool,
) -> dict:
    result: dict = {"ok": True, "subject": subject}
    github_url = _try_github_issue(
        actor,
        identity=identity,
        subject=subject,
        note=note,
        route=route,
        trail=trail,
        version=version,
        extra=extra,
        screenshot=screenshot,
        has_audio=has_audio,
    )
    if github_url:
        result["github_issue_url"] = github_url
    return result


def _try_github_issue(
    actor: ActorContext,
    *,
    identity: SystemBugIdentity,
    subject: str,
    note: str,
    route: str,
    trail: list[str],
    version: str,
    extra: dict[str, str],
    screenshot: bytes | None,
    has_audio: bool,
) -> str | None:
    if not github_issues_enabled():
        return None
    body = system_bug_issue_body(
        note=note,
        route=route,
        trail=trail,
        version=version,
        identity=identity,
        role=actor.role,
        extra=extra,
        has_audio=has_audio,
        has_screenshot=bool(screenshot),
    )
    try:
        return create_system_bug_issue(title=subject, body=body, screenshot=screenshot)
    except Exception:
        logger.exception("[github] issue creation failed after email")
        return None


def _deliver_to_all(
    recipients: list[str],
    subject: str,
    html: str,
    attachments: list[Attachment],
) -> bool:
    return deliver_html_email(
        to_email=recipients,
        subject=subject,
        html_content=html,
        kind="system-bug",
        attachments=attachments,
        allow_simulation=False,
    )


def _prepare_screenshot(data: bytes | None) -> tuple[bytes | None, str]:
    if not data:
        return None, "screenshot.jpg"
    try:
        jpeg, ext, _ = compress_photo_bytes(data)
        return jpeg, f"screenshot{ext}"
    except Exception:
        logger.warning("[system-bug] screenshot JPEG compress failed")
        if len(data) <= 800_000:
            return data, "screenshot.png"
        return None, "screenshot.jpg"


def _mail_attachments(
    screenshot: bytes | None,
    name: str,
    audio_file: Attachment | None,
) -> list[Attachment]:
    items: list[Attachment] = []
    if screenshot:
        items.append((name, screenshot))
    if audio_file:
        items.append(audio_file)
    return items


def _html_body(
    identity: SystemBugIdentity,
    role: str,
    note: str,
    route: str,
    trail: list[str],
    version: str,
    extra: dict[str, str],
    has_screenshot: bool = False,
    audio_name: str | None = None,
    has_audio: bool = False,
) -> str:
    meta = "".join(
        f"<tr><th align='right'>{escape(k)}</th><td>{escape(v)}</td></tr>"
        for k, v in system_bug_meta_rows(
            identity=identity, role=role, route=route, trail=trail, version=version, extra=extra
        )
    )
    body = escape(note) if note else "—"
    shot = _screenshot_html(has_screenshot)
    audio_note = _audio_html(audio_name, has_audio)
    return (
        f"<html><body dir='rtl'><h2>{escape(APP_NAME)} — תקלה במערכת</h2>"
        f"<p>{body}</p>{shot}{audio_note}<table>{meta}</table></body></html>"
    )


def _audio_html(audio_name: str | None, has_audio: bool) -> str:
    if audio_name:
        return f"<p>הקלטה מצורפת ({escape(audio_name)}).</p>"
    if has_audio:
        return "<p>הקלטה התקבלה (לא מצורפה למייל).</p>"
    return ""


def _screenshot_html(has_screenshot: bool) -> str:
    if not has_screenshot:
        return ""
    return (
        "<p><img src='cid:bug-screenshot' alt='screenshot' "
        "style='max-width:100%;height:auto'/></p>"
    )
