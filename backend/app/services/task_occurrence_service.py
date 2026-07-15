from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.core import config
from app.db import mappers as mp
from app.domain import roles, task_status
from app.domain.completion_transcript_localization import localize_completion_transcript
from app.domain.employee_language import normalize_employee_language
from app.domain.task_translation_source import task_source_language
from app.domain.scope import ActorContext
from app.domain.task_kind import AD_HOC, FIXED
from app.domain.task_scope import (
    branch_manager_owns_delegation,
    can_manage_tasks,
    employee_can_see_occurrence,
    visible_branch_ids_for_tasks,
)
from app.domain.task_reference_media import merge_occurrence_reference_media
from app.repositories.branch_repository import BranchRepository
from app.repositories.task_completion_repository import TaskCompletionRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.task_template_repository import TaskTemplateRepository
from app.repositories.user_repository import UserRepository
from app.services.completion_audio_transcription_service import transcribe_completion_audio
from app.services.task_translation_service import TaskTranslationService

TZ = ZoneInfo("Asia/Jerusalem")
_UNSET = object()


class TaskOccurrenceService:
    def __init__(
        self,
        occurrence_repo: TaskOccurrenceRepository,
        completion_repo: TaskCompletionRepository,
        branch_repo: BranchRepository,
        user_repo: UserRepository | None = None,
        translation_service: TaskTranslationService | None = None,
        template_repo: TaskTemplateRepository | None = None,
    ):
        self._occurrences = occurrence_repo
        self._completions = completion_repo
        self._branch = branch_repo
        self._users = user_repo
        self._translations = translation_service
        self._templates = template_repo

    def list_occurrences(
        self,
        actor: ActorContext,
        *,
        branch_id: str | None = None,
        status: str | None = None,
        due_on: str | None = None,
        due_from: str | None = None,
        due_to: str | None = None,
        pending_delegation: bool | None = None,
        task_kind: str | None = None,
    ) -> list[dict]:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה לצפות במשימות")
        branch_ids = visible_branch_ids_for_tasks(actor, self._branch)
        day = date.fromisoformat(due_on) if due_on else None
        day_from = date.fromisoformat(due_from) if due_from else None
        day_to = date.fromisoformat(due_to) if due_to else None
        items = self._occurrences.list_occurrences(
            branch_ids=branch_ids,
            branch_id=branch_id,
            status=status,
            due_on=day,
            due_from=day_from if not day else None,
            due_to=day_to if not day else None,
            pending_delegation=pending_delegation,
            task_kind=task_kind,
            manager_user_id=actor.user_id
            if pending_delegation and actor.role == roles.BRANCH_MANAGER
            else None,
        )
        return [self._to_api(o) for o in items]

    async def list_mine(
        self,
        actor: ActorContext,
        *,
        due_on: str | None = None,
        due_from: str | None = None,
        due_to: str | None = None,
    ) -> list[dict]:
        if actor.role != roles.EMPLOYEE:
            raise PermissionError("רק עובדים יכולים לראות את המשימות שלהם")
        day = date.fromisoformat(due_on) if due_on else None
        if not day and not due_from and not due_to:
            day = datetime.now(TZ).date()
        day_from = date.fromisoformat(due_from) if due_from else None
        day_to = date.fromisoformat(due_to) if due_to else None
        items = self._occurrences.list_occurrences(
            branch_id=actor.branch_id,
            for_employee_user_id=actor.user_id,
            due_on=day,
            due_from=day_from if not day else None,
            due_to=day_to if not day else None,
        )
        rows = [self._to_api(o) for o in items]
        language = "he"
        if self._users:
            user = self._users.find_by_id(actor.user_id)
            if user:
                language = user.preferred_language
        if self._translations:
            for row, occurrence in zip(rows, items):
                row["source_language"] = self._task_source_language(occurrence)
            return await self._translations.apply_to_occurrences_translated(rows, language=language)
        return rows

    async def translate_mine(
        self,
        actor: ActorContext,
        occurrence_ids: list[str],
    ) -> list[dict]:
        if actor.role != roles.EMPLOYEE:
            raise PermissionError("רק עובדים יכולים לתרגם משימות")
        if not self._translations or not self._users:
            return []
        user = self._users.find_by_id(actor.user_id)
        language = user.preferred_language if user else "he"
        cards: list[dict] = []
        for occ_id in occurrence_ids:
            occurrence = self._occurrences.find_by_id(occ_id)
            if not occurrence:
                continue
            if not employee_can_see_occurrence(
                actor,
                assignee_user_id=occurrence.assignee_user_id,
                branch_id=occurrence.branch_id,
            ):
                continue
            cards.append(
                {
                    "id": occurrence.id,
                    "title": occurrence.title,
                    "description": occurrence.description,
                    "source_language": self._task_source_language(occurrence),
                }
            )
        if not cards:
            return []
        return await self._translations.translate_cards(cards, language=language)

    def create_ad_hoc(
        self,
        actor: ActorContext,
        *,
        branch_id: str,
        title: str,
        description: str = "",
        due_at: str,
        assignee_user_id: str | None = None,
        photo_required: bool = True,
        reference_photo_url: str | None = None,
        reference_video_url: str | None = None,
        reference_audio_url: str | None = None,
    ) -> dict:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה ליצור משימות")
        if not (title or "").strip():
            raise ValueError("נדרש כותרת משימה")
        self._assert_branch_access(actor, branch_id)

        parsed = datetime.fromisoformat(due_at)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=TZ)

        manager_user_id: str | None = None
        final_assignee = assignee_user_id

        if actor.role == roles.NETWORK_MANAGER:
            if not self._users:
                raise RuntimeError("user repository required")
            branch_manager = self._users.find_by_branch_and_role(branch_id, roles.BRANCH_MANAGER)
            if not branch_manager:
                raise ValueError("לא נמצא מנהל סניף לסניף זה")
            manager_user_id = branch_manager.id
            final_assignee = None
        elif actor.role == roles.BRANCH_MANAGER:
            if assignee_user_id:
                self._validate_employee(branch_id, assignee_user_id)
            else:
                raise ValueError("נדרש שיוך לעובד למשימה מזדמנת")

        occurrence = self._occurrences.create(
            template_id=None,
            branch_id=branch_id,
            title=title,
            description=description,
            due_at=parsed,
            assignee_user_id=final_assignee,
            department_id=None,
            task_kind=AD_HOC,
            manager_user_id=manager_user_id,
            photo_required=photo_required,
            reference_photo_url=reference_photo_url,
            reference_video_url=reference_video_url,
            reference_audio_url=reference_audio_url,
            created_by_id=actor.user_id,
        )
        return self._to_api(occurrence)

    def delegate_occurrence(
        self, actor: ActorContext, occurrence_id: str, *, assignee_user_id: str
    ) -> dict:
        occurrence = self._occurrences.find_by_id(occurrence_id)
        if not occurrence:
            raise ValueError("משימה לא נמצאה")
        if actor.role != roles.BRANCH_MANAGER:
            raise PermissionError("רק מנהל סניף יכול להעביר משימות")
        if not branch_manager_owns_delegation(actor, manager_user_id=occurrence.manager_user_id):
            raise PermissionError("אין הרשאה להעביר משימה זו")
        if not occurrence.pending_delegation:
            raise ValueError("המשימה כבר שויכה לעובד")
        self._validate_employee(occurrence.branch_id, assignee_user_id)
        updated = self._occurrences.delegate(occurrence_id, assignee_user_id=assignee_user_id)
        assert updated is not None
        return self._to_api(updated)

    def start_occurrence(self, actor: ActorContext, occurrence_id: str) -> dict:
        occurrence = self._occurrences.find_by_id(occurrence_id)
        if not occurrence:
            raise ValueError("משימה לא נמצאה")
        if actor.role != roles.EMPLOYEE:
            raise PermissionError("רק עובדים יכולים להתחיל משימות")
        if not employee_can_see_occurrence(
            actor, assignee_user_id=occurrence.assignee_user_id, branch_id=occurrence.branch_id
        ):
            raise PermissionError("אין הרשאה לבצע משימה זו")
        if occurrence.status not in {task_status.PENDING, task_status.OVERDUE}:
            raise ValueError("ניתן להתחיל רק משימה במצב ממתין או באיחור")
        updated = self._occurrences.start(
            occurrence_id, started_by_id=actor.user_id, started_at=datetime.now(TZ)
        )
        assert updated is not None
        return self._to_api(updated)

    async def complete_occurrence(
        self,
        actor: ActorContext,
        occurrence_id: str,
        *,
        completion_status: str,
        note: str | None = None,
        photo_path: str | None = None,
        video_path: str | None = None,
        audio_path: str | None = None,
        not_completed_reason: str | None = None,
    ) -> dict:
        occurrence = self._occurrences.find_by_id(occurrence_id)
        if not occurrence:
            raise ValueError("משימה לא נמצאה")
        self._assert_can_complete(actor, occurrence)
        if occurrence.status in task_status.TERMINAL:
            raise ValueError("המשימה כבר נסגרה")
        if actor.role == roles.EMPLOYEE and occurrence.status == task_status.PENDING_REVIEW:
            raise ValueError("המשימה ממתינה לאישור מנהל")
        if actor.role == roles.EMPLOYEE and occurrence.status not in {
            task_status.IN_PROGRESS,
        }:
            raise ValueError("יש להתחיל את המשימה לפני הסיום")
        if completion_status not in {task_status.COMPLETION_DONE, task_status.COMPLETION_NOT_DONE}:
            raise ValueError("סטטוס סיום לא תקין")
        if completion_status == task_status.COMPLETION_NOT_DONE and not (not_completed_reason or "").strip():
            raise ValueError("נדרשת סיבה אם המשימה לא בוצעה")
        if (
            occurrence.photo_required
            and completion_status == task_status.COMPLETION_DONE
            and not any((p or "").strip() for p in (photo_path, video_path, audio_path))
        ):
            raise ValueError("נדרש לפחות קובץ מדיה (תמונה, וידאו או שמע) למשימה מזדמנת")

        note_clean = (note or "").strip() or None
        reason_clean = (not_completed_reason or "").strip() or None
        existing = self._completions.find_by_occurrence(occurrence_id)
        employee_submission = actor.role == roles.EMPLOYEE
        needs_review = (
            employee_submission and completion_status == task_status.COMPLETION_DONE
        )

        if existing and occurrence.status == task_status.IN_PROGRESS:
            completion = self._completions.update_submission(
                occurrence_id,
                status=completion_status,
                note=note_clean,
                photo_path=photo_path,
                video_path=video_path,
                audio_path=audio_path,
                not_completed_reason=reason_clean,
                completed_by_id=actor.user_id,
                manager_review_status=task_status.REVIEW_PENDING if needs_review else None,
            )
        else:
            if existing:
                raise ValueError("המשימה כבר נשלחה לבדיקה")
            completion = self._completions.create(
                occurrence_id=occurrence_id,
                status=completion_status,
                note=note_clean,
                photo_path=photo_path,
                video_path=video_path,
                audio_path=audio_path,
                not_completed_reason=reason_clean,
                completed_by_id=actor.user_id,
                manager_review_status=task_status.REVIEW_PENDING if needs_review else None,
            )
        assert completion is not None

        if employee_submission and (audio_path or "").strip():
            manager_lang = self._manager_language(occurrence)
            employee_lang = "he"
            if self._users:
                submitter = self._users.find_by_id(actor.user_id)
                if submitter and submitter.preferred_language:
                    employee_lang = submitter.preferred_language
            transcript = await transcribe_completion_audio(
                audio_path,
                manager_language=manager_lang,
            )
            employee_transcript = transcript
            if transcript:
                employee_transcript = await localize_completion_transcript(
                    transcript,
                    source_language=normalize_employee_language(manager_lang),
                    target_language=normalize_employee_language(employee_lang),
                )
            if transcript or employee_transcript:
                updated_completion = self._completions.update_audio_transcripts(
                    occurrence_id,
                    audio_transcript=transcript,
                    audio_transcript_employee=employee_transcript,
                )
                if updated_completion:
                    completion = updated_completion

        if completion_status == task_status.COMPLETION_NOT_DONE:
            new_status = task_status.CANCELLED
        elif needs_review:
            new_status = task_status.PENDING_REVIEW
        else:
            new_status = task_status.COMPLETED

        updated = self._occurrences.update_status(occurrence_id, new_status)
        assert updated is not None
        data = self._to_api(updated)
        data["completion"] = mp.task_completion_domain_to_api(completion)
        return data

    def approve_occurrence(self, actor: ActorContext, occurrence_id: str) -> dict:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה לאשר משימות")
        occurrence = self._occurrences.find_by_id(occurrence_id)
        if not occurrence:
            raise ValueError("משימה לא נמצאה")
        self._assert_branch_access(actor, occurrence.branch_id)
        if occurrence.status != task_status.PENDING_REVIEW:
            raise ValueError("המשימה לא ממתינה לאישור")
        completion = self._completions.find_by_occurrence(occurrence_id)
        if not completion:
            raise ValueError("לא נמצאה הגשת סיום")
        reviewed = self._completions.update_review(
            occurrence_id,
            manager_review_status=task_status.REVIEW_APPROVED,
            manager_reviewed_by_id=actor.user_id,
            manager_reviewed_at=datetime.now(TZ),
        )
        assert reviewed is not None
        updated = self._occurrences.update_status(occurrence_id, task_status.COMPLETED)
        assert updated is not None
        data = self._to_api(updated)
        data["completion"] = mp.task_completion_domain_to_api(reviewed)
        return data

    def reopen_occurrence(
        self, actor: ActorContext, occurrence_id: str, *, rejection_note: str | None = None
    ) -> dict:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה לפתוח מחדש משימות")
        occurrence = self._occurrences.find_by_id(occurrence_id)
        if not occurrence:
            raise ValueError("משימה לא נמצאה")
        self._assert_branch_access(actor, occurrence.branch_id)
        if occurrence.status != task_status.PENDING_REVIEW:
            raise ValueError("המשימה לא ממתינה לאישור")
        completion = self._completions.find_by_occurrence(occurrence_id)
        if not completion:
            raise ValueError("לא נמצאה הגשת סיום")
        note_clean = (rejection_note or "").strip() or None
        reviewed = self._completions.update_review(
            occurrence_id,
            manager_review_status=task_status.REVIEW_REJECTED,
            manager_reviewed_by_id=actor.user_id,
            manager_reviewed_at=datetime.now(TZ),
            rejection_note=note_clean,
        )
        assert reviewed is not None
        updated = self._occurrences.reopen_after_review(occurrence_id)
        assert updated is not None
        data = self._to_api(updated)
        data["completion"] = mp.task_completion_domain_to_api(reviewed)
        return data

    def cancel_occurrence(self, actor: ActorContext, occurrence_id: str) -> dict:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה לבטל משימות")
        occurrence = self._occurrences.find_by_id(occurrence_id)
        if not occurrence:
            raise ValueError("משימה לא נמצאה")
        self._assert_branch_access(actor, occurrence.branch_id)
        if occurrence.status in task_status.TERMINAL:
            raise ValueError("המשימה כבר נסגרה")
        updated = self._occurrences.update_status(occurrence_id, task_status.CANCELLED)
        assert updated is not None
        return self._to_api(updated)

    def update_occurrence(
        self,
        actor: ActorContext,
        occurrence_id: str,
        *,
        title: str,
        description: str = "",
        due_at: str,
        assignee_user_id: str | None = None,
        photo_required: bool | None = None,
        reference_photo_url: str | None | object = _UNSET,
        reference_video_url: str | None | object = _UNSET,
        reference_audio_url: str | None | object = _UNSET,
    ) -> dict:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה לערוך משימות")
        occurrence = self._occurrences.find_by_id(occurrence_id)
        if not occurrence:
            raise ValueError("משימה לא נמצאה")
        self._assert_branch_access(actor, occurrence.branch_id)
        if occurrence.status in task_status.TERMINAL:
            raise ValueError("לא ניתן לערוך משימה שנסגרה")
        if occurrence.status == task_status.PENDING_REVIEW:
            raise ValueError("לא ניתן לערוך משימה שממתינה לאישור")
        if not (title or "").strip():
            raise ValueError("נדרש כותרת משימה")

        parsed = datetime.fromisoformat(due_at)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=TZ)

        if occurrence.pending_delegation:
            if assignee_user_id:
                self._validate_employee(occurrence.branch_id, assignee_user_id)
            final_assignee = assignee_user_id
        elif assignee_user_id:
            self._validate_employee(occurrence.branch_id, assignee_user_id)
            final_assignee = assignee_user_id
        elif occurrence.task_kind == AD_HOC and actor.role == roles.BRANCH_MANAGER:
            raise ValueError("נדרש שיוך לעובד")
        else:
            final_assignee = occurrence.assignee_user_id

        updated = self._occurrences.update_details(
            occurrence_id,
            title=title,
            description=description,
            due_at=parsed,
            assignee_user_id=final_assignee,
            photo_required=photo_required,
            reference_photo_url=reference_photo_url if reference_photo_url is not _UNSET else None,
            reference_video_url=reference_video_url if reference_video_url is not _UNSET else None,
            reference_audio_url=reference_audio_url if reference_audio_url is not _UNSET else None,
            update_reference_photo=reference_photo_url is not _UNSET,
            update_reference_video=reference_video_url is not _UNSET,
            update_reference_audio=reference_audio_url is not _UNSET,
        )
        assert updated is not None
        return self._to_api(updated)

    def get_occurrence(self, actor: ActorContext, occurrence_id: str) -> dict:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה לצפות במשימות")
        occurrence = self._occurrences.find_by_id(occurrence_id)
        if not occurrence:
            raise ValueError("משימה לא נמצאה")
        self._assert_branch_access(actor, occurrence.branch_id)
        merged = self._with_reference_media(occurrence)
        if self._reference_media_differs(occurrence, merged):
            synced = self._occurrences.update_reference_media(
                occurrence.id,
                reference_photo_url=merged.reference_photo_url,
                reference_video_url=merged.reference_video_url,
                reference_audio_url=merged.reference_audio_url,
            )
            assert synced is not None
            occurrence = synced
        return self._to_api(occurrence)

    def _reference_media_differs(self, left, right) -> bool:
        return (
            (left.reference_photo_url or None) != (right.reference_photo_url or None)
            or (left.reference_video_url or None) != (right.reference_video_url or None)
            or (left.reference_audio_url or None) != (right.reference_audio_url or None)
        )

    def _task_source_language(self, occurrence) -> str:
        return task_source_language(occurrence, self._users)

    def _manager_language(self, occurrence) -> str:
        manager_id = occurrence.manager_user_id or occurrence.created_by_id
        if manager_id and self._users:
            manager = self._users.find_by_id(manager_id)
            if manager and manager.preferred_language:
                return normalize_employee_language(manager.preferred_language)
        return normalize_employee_language(config.GOOGLE_TRANSLATE_SOURCE or "he")

    def _assert_branch_access(self, actor: ActorContext, branch_id: str) -> None:
        branch_ids = visible_branch_ids_for_tasks(actor, self._branch)
        if branch_ids is not None and branch_id not in branch_ids:
            raise PermissionError("אין הרשאה לסניף זה")

    def _validate_employee(self, branch_id: str, assignee_user_id: str) -> None:
        if not self._users:
            raise RuntimeError("user repository required")
        user = self._users.find_by_id(assignee_user_id)
        if not user or user.role != roles.EMPLOYEE or user.branch_id != branch_id:
            raise ValueError("עובד לא שייך לסניף")

    def _assert_can_complete(self, actor: ActorContext, occurrence) -> None:
        if can_manage_tasks(actor):
            self._assert_branch_access(actor, occurrence.branch_id)
            return
        if not employee_can_see_occurrence(
            actor, assignee_user_id=occurrence.assignee_user_id, branch_id=occurrence.branch_id
        ):
            raise PermissionError("אין הרשאה לבצע משימה זו")

    def _to_api(self, occurrence) -> dict:
        occurrence = self._with_reference_media(occurrence)
        completion = self._completions.find_by_occurrence(occurrence.id)
        return mp.task_occurrence_domain_to_api(
            occurrence,
            branch_name=self._occurrences.get_branch_name(occurrence.branch_id),
            department_name=self._occurrences.get_department_name(occurrence.department_id),
            assignee_name=self._occurrences.get_assignee_name(occurrence.assignee_user_id),
            manager_name=self._occurrences.get_manager_name(occurrence.manager_user_id),
            completion=mp.task_completion_domain_to_api(completion) if completion else None,
        )

    def _with_reference_media(self, occurrence):
        if not occurrence.template_id or not self._templates:
            return occurrence
        template = self._templates.find_by_id(occurrence.template_id)
        return merge_occurrence_reference_media(occurrence, template)
