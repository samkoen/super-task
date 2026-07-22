"""Chat tâche oved ↔ menahel (+ i18n texte/audio)."""
from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from app.core import config
from app.db import mappers as mp
from app.domain import roles, task_status
from app.domain.completion_transcript_localization import localize_completion_transcript
from app.domain.employee_language import normalize_employee_language
from app.domain.scope import ActorContext
from app.domain.task_chat import (
    can_employee_post,
    can_manager_post,
    has_message_content,
    message_event_type,
    next_status_after_employee_message,
    next_status_after_manager_message,
)
from app.domain.task_chat_i18n import (
    display_chat_audio_transcript,
    display_chat_body,
    languages_differ,
    normalize_pair,
)
from app.domain.task_scope import can_manage_tasks
from app.repositories.branch_repository import BranchRepository
from app.repositories.task_completion_repository import TaskCompletionRepository
from app.repositories.task_message_repository import TaskMessageRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.user_repository import UserRepository
from app.services.completion_audio_transcription_service import transcribe_completion_audio

TZ = ZoneInfo("Asia/Jerusalem")


class TaskMessageService:
    def __init__(
        self,
        message_repo: TaskMessageRepository,
        occurrence_repo: TaskOccurrenceRepository,
        user_repo: UserRepository,
        branch_repo: BranchRepository,
        completion_repo: TaskCompletionRepository | None = None,
    ):
        self._messages = message_repo
        self._occurrences = occurrence_repo
        self._users = user_repo
        self._branches = branch_repo
        self._completions = completion_repo

    def list_messages(self, actor: ActorContext, occurrence_id: str) -> list[dict]:
        occurrence = self._require_occurrence(occurrence_id)
        self._assert_can_access(actor, occurrence)
        items = self._messages.list_for_occurrence(occurrence_id)
        return [self._to_api(m, actor=actor) for m in items]

    async def post_message(
        self,
        actor: ActorContext,
        occurrence_id: str,
        *,
        body: str | None = None,
        photo_url: str | None = None,
        video_url: str | None = None,
        audio_url: str | None = None,
    ) -> dict:
        if not has_message_content(body, photo_url, video_url, audio_url):
            raise ValueError("נדרש טקסט או מדיה להודעה")

        occurrence = self._require_occurrence(occurrence_id)
        self._assert_can_access(actor, occurrence)
        is_manager = can_manage_tasks(actor)
        is_assignee = occurrence.assignee_user_id == actor.user_id

        if actor.role == roles.EMPLOYEE:
            if not is_assignee:
                raise PermissionError("רק העובד המשויך יכול לשלוח הודעה")
            if not can_employee_post(occurrence.status):
                raise ValueError("לא ניתן לשלוח הודעה בסטטוס הנוכחי")
        elif is_manager:
            if not can_manager_post(occurrence.status):
                raise ValueError("לא ניתן לשלוח הודעה בסטטוס הנוכחי")
        else:
            raise PermissionError("אין הרשאה לשלוח הודעה")

        message = self._messages.create(
            occurrence_id=occurrence_id,
            sender_user_id=actor.user_id,
            body=body,
            photo_url=photo_url,
            video_url=video_url,
            audio_url=audio_url,
        )

        message = await self._enrich_i18n(message, actor=actor, occurrence=occurrence)

        new_status: str | None = None
        if actor.role == roles.EMPLOYEE:
            new_status = next_status_after_employee_message(occurrence.status)
        elif is_manager:
            new_status = next_status_after_manager_message(occurrence.status)
            if occurrence.status == task_status.PENDING_REVIEW and self._completions:
                self._completions.update_review(
                    occurrence_id,
                    manager_review_status=task_status.REVIEW_REJECTED,
                    manager_reviewed_by_id=actor.user_id,
                    manager_reviewed_at=datetime.now(TZ),
                    rejection_note=(body or "").strip()[:500] or None,
                )
                self._occurrences.reopen_after_review(occurrence_id)
                new_status = None

        if new_status and new_status != occurrence.status:
            self._occurrences.update_status(occurrence_id, new_status)

        updated = self._occurrences.find_by_id(occurrence_id)
        assert updated is not None
        return {
            "message": self._to_api(message, actor=actor),
            "occurrence": mp.task_occurrence_domain_to_api(updated),
            "event_type": message_event_type(actor.role),
        }

    async def _enrich_i18n(self, message, *, actor: ActorContext, occurrence):
        sender_lang, recipient_lang = self._resolve_languages(actor, occurrence)
        body_translated = None
        audio_transcript = None
        audio_transcript_sender = None

        body_text = (message.body or "").strip()
        if body_text and languages_differ(sender_lang, recipient_lang):
            body_translated = await localize_completion_transcript(
                body_text,
                source_language=sender_lang,
                target_language=recipient_lang,
            )
        elif body_text:
            body_translated = body_text

        audio_url = (message.audio_url or "").strip()
        if audio_url:
            # Même תמלול que clôture tâche (Gemini → langue destinataire)
            audio_transcript = await transcribe_completion_audio(
                audio_url,
                manager_language=recipient_lang,
            )
            if audio_transcript:
                # Même localisation Google Translate que clôture / création
                if languages_differ(recipient_lang, sender_lang):
                    audio_transcript_sender = await localize_completion_transcript(
                        audio_transcript,
                        source_language=recipient_lang,
                        target_language=sender_lang,
                    )
                else:
                    audio_transcript_sender = audio_transcript

        if body_translated is None and audio_transcript is None and audio_transcript_sender is None:
            return message

        updated = self._messages.update_i18n(
            message.id,
            body_translated=body_translated,
            audio_transcript=audio_transcript,
            audio_transcript_sender=audio_transcript_sender,
        )
        return updated or message

    def _resolve_languages(self, actor: ActorContext, occurrence) -> tuple[str, str]:
        sender = self._users.find_by_id(actor.user_id)
        sender_lang = normalize_employee_language(
            (sender.preferred_language if sender else None)
            or config.GOOGLE_TRANSLATE_SOURCE
            or "he"
        )

        if actor.role == roles.EMPLOYEE:
            recipient_lang = self._manager_language(occurrence)
        else:
            recipient_lang = self._assignee_language(occurrence)

        return normalize_pair(sender_lang, recipient_lang)

    def _manager_language(self, occurrence) -> str:
        manager_id = occurrence.manager_user_id or occurrence.created_by_id
        if manager_id:
            manager = self._users.find_by_id(manager_id)
            if manager and manager.preferred_language:
                return normalize_employee_language(manager.preferred_language)
        return normalize_employee_language(config.GOOGLE_TRANSLATE_SOURCE or "he")

    def _assignee_language(self, occurrence) -> str:
        if occurrence.assignee_user_id:
            emp = self._users.find_by_id(occurrence.assignee_user_id)
            if emp and emp.preferred_language:
                return normalize_employee_language(emp.preferred_language)
        return normalize_employee_language(config.GOOGLE_TRANSLATE_SOURCE or "he")

    def _require_occurrence(self, occurrence_id: str):
        occurrence = self._occurrences.find_by_id(occurrence_id)
        if not occurrence:
            raise ValueError("משימה לא נמצאה")
        return occurrence

    def _assert_can_access(self, actor: ActorContext, occurrence) -> None:
        if can_manage_tasks(actor):
            branch = self._branches.find_by_id(occurrence.branch_id)
            if not branch:
                raise ValueError("סניף לא נמצא")
            from app.domain.scope import assert_branch_visible

            assert_branch_visible(actor, branch.network_id, branch.id)
            return
        if actor.role == roles.EMPLOYEE and occurrence.assignee_user_id == actor.user_id:
            return
        raise PermissionError("אין הרשאה לצפות בהודעות")

    def _to_api(self, message, *, actor: ActorContext | None = None) -> dict:
        sender = self._users.find_by_id(message.sender_user_id)
        viewer_is_sender = bool(actor and actor.user_id == message.sender_user_id)
        display_body = display_chat_body(
            body=message.body,
            body_translated=message.body_translated,
            viewer_is_sender=viewer_is_sender,
        )
        display_transcript = display_chat_audio_transcript(
            audio_transcript=message.audio_transcript,
            audio_transcript_sender=message.audio_transcript_sender,
            viewer_is_sender=viewer_is_sender,
        )
        return mp.task_message_domain_to_api(
            message,
            sender_name=sender.full_name if sender else None,
            sender_role=sender.role if sender else None,
            display_body=display_body,
            display_audio_transcript=display_transcript,
        )
