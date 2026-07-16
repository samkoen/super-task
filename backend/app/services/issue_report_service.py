"""Signalement de problèmes par les employés."""
from __future__ import annotations

from app.domain import roles
from app.domain.scope import ActorContext
from app.domain.task_scope import visible_branch_ids_for_tasks
from app.repositories.branch_repository import BranchRepository
from app.repositories.issue_report_repository import IssueReportRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.user_repository import UserRepository

_ISSUE_REPORTED_KIND = "issue_reported"
_ISSUE_TITLE = "דיווח על תקלה"
_TEXT_PREVIEW_LEN = 80


def _has_content(
    text: str | None,
    photo_url: str | None,
    video_url: str | None,
    audio_url: str | None,
) -> bool:
    if (text or "").strip():
        return True
    return any((p or "").strip() for p in (photo_url, video_url, audio_url))


def _text_preview(text: str | None) -> str:
    cleaned = (text or "").strip()
    if not cleaned:
        return ""
    if len(cleaned) <= _TEXT_PREVIEW_LEN:
        return cleaned
    return f"{cleaned[:_TEXT_PREVIEW_LEN]}…"


class IssueReportService:
    def __init__(
        self,
        repo: IssueReportRepository,
        user_repo: UserRepository,
        branch_repo: BranchRepository,
        notification_repo: NotificationRepository,
    ):
        self._repo = repo
        self._users = user_repo
        self._branch = branch_repo
        self._notifications = notification_repo

    def create_report(
        self,
        actor: ActorContext,
        *,
        text: str | None = None,
        photo_url: str | None = None,
        video_url: str | None = None,
        audio_url: str | None = None,
    ) -> tuple[dict, list[tuple[str, str, str]]]:
        if actor.role != roles.EMPLOYEE:
            raise PermissionError("רק עובד יכול לדווח על תקלה")
        if not actor.branch_id:
            raise ValueError("עובד ללא סניף משויך")

        cleaned_text = (text or "").strip() or None
        cleaned_photo = (photo_url or "").strip() or None
        cleaned_video = (video_url or "").strip() or None
        cleaned_audio = (audio_url or "").strip() or None

        if not _has_content(cleaned_text, cleaned_photo, cleaned_video, cleaned_audio):
            raise ValueError("נדרש לפחות טקסט או קובץ מדיה אחד")

        reporter = self._users.find_by_id(actor.user_id)
        reporter_name = reporter.full_name if reporter else "עובד"

        report = self._repo.create(
            reporter_user_id=actor.user_id,
            branch_id=actor.branch_id,
            text=cleaned_text,
            photo_url=cleaned_photo,
            video_url=cleaned_video,
            audio_url=cleaned_audio,
        )

        preview = _text_preview(cleaned_text)
        detail = f": {preview}" if preview else ""
        message = f"{reporter_name} דיווח/ה על תקלה{detail}"

        pending: list[tuple[str, str, str]] = []
        managers = self._users.list_users(
            role=roles.BRANCH_MANAGER, branch_ids=[actor.branch_id]
        )
        for mgr in managers:
            if not mgr.is_active:
                continue
            row = self._notifications.create(
                user_id=mgr.id,
                kind=_ISSUE_REPORTED_KIND,
                title=_ISSUE_TITLE,
                message=message,
                branch_id=actor.branch_id,
                issue_report_id=report.id,
            )
            pending.append((mgr.id, row.id, _ISSUE_REPORTED_KIND))

        return self._enrich_report(report), pending

    def get_report(self, actor: ActorContext, report_id: str) -> dict:
        report = self._repo.find_by_id(report_id)
        if not report:
            raise ValueError("דיווח לא נמצא")
        self._assert_can_read(actor, report)
        return self._enrich_report(report)

    def list_for_manager(self, actor: ActorContext) -> list[dict]:
        if actor.role not in {
            roles.ADMIN,
            roles.NETWORK_MANAGER,
            roles.BRANCH_MANAGER,
        }:
            raise PermissionError("אין הרשאה לצפות בדיווחי תקלות")

        branch_ids = visible_branch_ids_for_tasks(actor, self._branch)
        reports = self._repo.list_reports(branch_ids=branch_ids)
        return [self._enrich_report(r) for r in reports]

    def delete_report(self, actor: ActorContext, report_id: str) -> None:
        if actor.role not in {
            roles.ADMIN,
            roles.NETWORK_MANAGER,
            roles.BRANCH_MANAGER,
        }:
            raise PermissionError("אין הרשאה למחוק דיווח תקלה")
        report = self._repo.find_by_id(report_id)
        if not report:
            raise ValueError("דיווח לא נמצא")
        self._assert_can_read(actor, report)
        self._notifications.clear_issue_report_links(report_id)
        if not self._repo.delete(report_id):
            raise ValueError("דיווח לא נמצא")

    def _assert_can_read(self, actor: ActorContext, report) -> None:
        if actor.role == roles.EMPLOYEE:
            if report.reporter_user_id != actor.user_id:
                raise PermissionError("אין הרשאה לצפות בדיווח זה")
            return

        if actor.role in {roles.ADMIN, roles.NETWORK_MANAGER, roles.BRANCH_MANAGER}:
            branch_ids = visible_branch_ids_for_tasks(actor, self._branch)
            if branch_ids is not None and report.branch_id not in branch_ids:
                raise PermissionError("אין הרשאה לצפות בדיווח זה")
            return

        raise PermissionError("אין הרשאה לצפות בדיווח זה")

    def _enrich_report(self, report) -> dict:
        data = report.to_dict()
        reporter = self._users.find_by_id(report.reporter_user_id)
        if reporter:
            data["reporter_name"] = reporter.full_name
        branch = self._branch.find_by_id(report.branch_id)
        if branch:
            data["branch_name"] = branch.name
        return data
