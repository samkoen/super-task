from datetime import date, datetime
from uuid import uuid4
from zoneinfo import ZoneInfo

from app.core import config
from app.db import mappers as mp
from app.domain import roles, task_status
from app.domain.completion_media import (
    assert_attachments_match,
    assert_completion_media,
    effective_requirements,
    first_path_of_kind,
    packed_media_fields,
    parse_requirements_input,
    resolve_completion_attachments,
)
from app.domain.audio_transcription_fallback import (
    transcript_or_unavailable,
    transcription_unavailable_message,
)
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
from app.domain.task_title_from_description import resolve_create_title
from app.domain.task_reference_media import merge_occurrence_reference_media
from app.domain.gallery_add_eligibility import can_add_occurrence_to_gallery
from app.domain.gallery_employee_claim import gallery_item_claimable_by_employee
from app.domain.network_fixed_task import (
    can_edit_network_fixed_group,
    grouped_occurrence_ids,
    pick_first_employee,
    select_network_create_branches,
    siblings_by_occurrence_content,
)
from app.domain.user_membership import employee_belongs_to_branch
from app.repositories.branch_repository import BranchRepository
from app.repositories.task_gallery_repository import TaskGalleryRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.task_completion_repository import TaskCompletionRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.task_template_repository import TaskTemplateRepository
from app.repositories.user_branch_membership_repository import UserBranchMembershipRepository
from app.repositories.user_repository import UserRepository
from app.services import blob_storage
from app.services.completion_audio_transcription_service import transcribe_completion_audio
from app.services.media_retention_service import MediaRetentionService
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
        media_retention: MediaRetentionService | None = None,
        notification_repo: NotificationRepository | None = None,
        gallery_repo: TaskGalleryRepository | None = None,
    ):
        self._occurrences = occurrence_repo
        self._completions = completion_repo
        self._branch = branch_repo
        self._users = user_repo
        self._translations = translation_service
        self._templates = template_repo
        self._media_retention = media_retention or MediaRetentionService(
            occurrence_repo, completion_repo, template_repo=template_repo
        )
        self._notifications = notification_repo
        self._gallery = gallery_repo

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
        now = datetime.now(TZ)
        branch_ids = visible_branch_ids_for_tasks(actor, self._branch)
        self._occurrences.rollover_open_tasks_to_day(
            now.date(), now=now, branch_ids=branch_ids
        )
        self._occurrences.mark_overdue_before(now, branch_ids=branch_ids)
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
        in_gallery = set()
        if self._gallery and items:
            in_gallery = self._gallery.source_occurrence_ids_in([o.id for o in items])
        return self._occurrences_to_api(items, in_gallery=in_gallery)

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
        now = datetime.now(TZ)
        scope_branches = [actor.branch_id] if actor.branch_id else []
        self._occurrences.rollover_open_tasks_to_day(
            now.date(), now=now, branch_ids=scope_branches
        )
        self._occurrences.mark_overdue_before(now, branch_ids=scope_branches)
        day = date.fromisoformat(due_on) if due_on else None
        if not day and not due_from and not due_to:
            day = now.date()
        day_from = date.fromisoformat(due_from) if due_from else None
        day_to = date.fromisoformat(due_to) if due_to else None
        items = self._occurrences.list_occurrences(
            branch_id=actor.branch_id,
            for_employee_user_id=actor.user_id,
            due_on=day,
            due_from=day_from if not day else None,
            due_to=day_to if not day else None,
        )
        rows = self._occurrences_to_api(items)
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
        min_video_seconds: int | None = None,
        completion_requirements: object | None = None,
        reference_photo_url: str | None = None,
        reference_video_url: str | None = None,
        reference_audio_url: str | None = None,
        source_gallery_item_id: str | None = None,
        network_group_id: str | None = None,
        self_claim: bool = False,
    ) -> dict:
        self._assert_can_create_ad_hoc(
            actor, branch_id, assignee_user_id, self_claim=self_claim
        )
        title = resolve_create_title(title, description)
        self._assert_branch_access(actor, branch_id)

        parsed = datetime.fromisoformat(due_at)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=TZ)

        if not assignee_user_id:
            raise ValueError("נדרש שיוך לעובד למשימה מזדמנת")
        self._validate_employee(branch_id, assignee_user_id)

        photo, video, audio = self._isolate_issue_media(
            reference_photo_url, reference_video_url, reference_audio_url
        )
        gallery_id = (source_gallery_item_id or "").strip() or None
        media_fields = packed_media_fields(
            parse_requirements_input(
                completion_requirements,
                provided=completion_requirements is not None,
                photo_required=photo_required,
                min_video_seconds=min_video_seconds,
            )
        )
        occurrence = self._occurrences.create(
            template_id=None,
            branch_id=branch_id,
            title=title,
            description=description,
            due_at=parsed,
            assignee_user_id=assignee_user_id,
            department_id=None,
            task_kind=AD_HOC,
            manager_user_id=None,
            reference_photo_url=photo,
            reference_video_url=video,
            reference_audio_url=audio,
            created_by_id=actor.user_id,
            source_gallery_item_id=gallery_id,
            network_group_id=network_group_id,
            **media_fields,
        )
        return self._to_api(occurrence, already_in_gallery=False)

    def claim_gallery_item(self, actor: ActorContext, item_id: str) -> dict:
        item = self._require_claimable_gallery(actor, item_id)
        assert actor.branch_id is not None
        return self.create_ad_hoc(
            actor,
            branch_id=actor.branch_id,
            title=item.title,
            description=item.description,
            due_at=datetime.now(TZ).isoformat(),
            assignee_user_id=actor.user_id,
            photo_required=item.photo_required,
            min_video_seconds=item.min_video_seconds,
            completion_requirements=item.completion_requirements,
            reference_photo_url=item.reference_photo_url,
            reference_video_url=item.reference_video_url,
            reference_audio_url=item.reference_audio_url,
            source_gallery_item_id=item.id,
            self_claim=True,
        )

    def _require_claimable_gallery(self, actor: ActorContext, item_id: str):
        if not self._gallery:
            raise ValueError("גלריה לא זמינה")
        item = self._gallery.find_by_id(item_id)
        if not item:
            raise ValueError("פריט גלריה לא נמצא")
        if not gallery_item_claimable_by_employee(
            employee_can_claim=item.employee_can_claim,
            item_network_id=item.network_id,
            item_branch_id=item.branch_id,
            actor=actor,
        ):
            raise PermissionError("אין הרשאה להוסיף משימה זו")
        return item

    def _assert_can_create_ad_hoc(
        self,
        actor: ActorContext,
        branch_id: str,
        assignee_user_id: str | None,
        *,
        self_claim: bool,
    ) -> None:
        if self_claim:
            if actor.role != roles.EMPLOYEE:
                raise PermissionError("רק עובד יכול להוסיף משימה לעצמו")
            if assignee_user_id != actor.user_id:
                raise PermissionError("ניתן לשייך רק לעצמך")
            return
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה ליצור משימות")

    @staticmethod
    def _isolate_issue_media(
        photo: str | None, video: str | None, audio: str | None
    ) -> tuple[str | None, str | None, str | None]:
        """Copie les médias issus d'un issue report pour ne pas les partager à la purge."""

        def _copy_if_issue(url: str | None, folder: str) -> str | None:
            if not url:
                return url
            if "issue_" not in url and "gallery_" not in url:
                return url
            return blob_storage.copy_media_url(url, folder=folder)

        return (
            _copy_if_issue(photo, "task_photos"),
            _copy_if_issue(video, "task_videos"),
            _copy_if_issue(audio, "task_audio"),
        )

    def create_ad_hoc_for_network(
        self,
        actor: ActorContext,
        *,
        title: str,
        description: str = "",
        due_at: str,
        photo_required: bool = True,
        min_video_seconds: int | None = None,
        completion_requirements: object | None = None,
        reference_photo_url: str | None = None,
        reference_video_url: str | None = None,
        reference_audio_url: str | None = None,
        source_gallery_item_id: str | None = None,
        branch_ids: list[str] | None = None,
    ) -> dict:
        """Duplique une מזדמנת (tous les snifim, ou une liste). 1er oved par snif."""
        if actor.role not in {roles.NETWORK_MANAGER, roles.ADMIN}:
            raise PermissionError("יצירה לכל הרשת למנהל רשת בלבד")
        branches = select_network_create_branches(
            self._network_branches(actor), branch_ids
        )
        if not branches:
            raise ValueError("אין סניפים ברשת")
        photo, video, audio = self._isolate_issue_media(
            reference_photo_url, reference_video_url, reference_audio_url
        )
        group_id = str(uuid4())
        created, skipped = self._create_network_ad_hoc_copies(
            actor,
            branches,
            title=title,
            description=description,
            due_at=due_at,
            photo_required=photo_required,
            min_video_seconds=min_video_seconds,
            completion_requirements=completion_requirements,
            reference_photo_url=photo,
            reference_video_url=video,
            reference_audio_url=audio,
            source_gallery_item_id=source_gallery_item_id,
            network_group_id=group_id,
        )
        if not created:
            raise ValueError("לא נוצרו משימות — אין עובדים בסניפים")
        return {"occurrences": created, "skipped": skipped}

    def _create_network_ad_hoc_copies(self, actor, branches, **fields) -> tuple[list, list]:
        created: list[dict] = []
        skipped: list[dict] = []
        for branch in branches:
            item = self._create_network_ad_hoc_copy(actor, branch, **fields)
            if item is None:
                skipped.append(
                    {
                        "branch_id": branch.id,
                        "branch_name": branch.name,
                        "reason": "אין עובד בסניף",
                    }
                )
            else:
                created.append(item)
        return created, skipped

    def _create_network_ad_hoc_copy(self, actor, branch, **fields) -> dict | None:
        if not self._users:
            raise RuntimeError("user repository required")
        employees = self._users.list_users(role=roles.EMPLOYEE, branch_ids=[branch.id])
        first = pick_first_employee(employees)
        if not first:
            return None
        return self.create_ad_hoc(
            actor, branch_id=branch.id, assignee_user_id=first.id, **fields
        )

    def _network_branches(self, actor: ActorContext) -> list:
        visible = visible_branch_ids_for_tasks(actor, self._branch)
        if visible is None:
            return self._branch.list_branches()
        if actor.network_id:
            return self._branch.list_branches(network_id=actor.network_id)
        return [b for bid in visible if (b := self._branch.find_by_id(bid))]

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

    def set_manager_next(
        self,
        actor: ActorContext,
        occurrence_id: str,
        *,
        enabled: bool,
    ) -> dict:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה לסמן משימה הבאה")
        occurrence = self._occurrences.find_by_id(occurrence_id)
        if not occurrence:
            raise ValueError("משימה לא נמצאה")
        self._assert_branch_access(actor, occurrence.branch_id)
        if not occurrence.assignee_user_id:
            raise ValueError("יש לשייך עובד לפני סימון המשימה הבאה")
        if occurrence.status in task_status.TERMINAL or occurrence.status == task_status.PENDING_REVIEW:
            raise ValueError("לא ניתן לסמן משימה זו כהבאה")
        if enabled:
            self._occurrences.clear_manager_next_for_assignee(occurrence.assignee_user_id)
            updated = self._occurrences.set_manager_next(
                occurrence_id, manager_next_at=datetime.now(TZ)
            )
        else:
            updated = self._occurrences.set_manager_next(occurrence_id, manager_next_at=None)
        assert updated is not None
        return self._to_api(updated)

    @staticmethod
    def _pack_attachments(attachments: list) -> dict:
        return {
            "attachments": attachments,
            "photo_path": first_path_of_kind(attachments, "photo"),
            "video_path": first_path_of_kind(attachments, "video"),
            "audio_path": first_path_of_kind(attachments, "audio"),
        }

    @staticmethod
    def _validated_completion_media(
        actor,
        occurrence,
        *,
        photo_path,
        video_path,
        audio_path,
        video_duration_seconds,
        completion_attachments,
    ) -> dict:
        raw_reqs = getattr(occurrence, "completion_requirements", None)
        attachments = resolve_completion_attachments(
            effective_requirements(raw_reqs) if raw_reqs is not None else [],
            attachments=completion_attachments,
            photo_path=photo_path,
            video_path=video_path,
            audio_path=audio_path,
            video_duration_seconds=video_duration_seconds,
        )
        if raw_reqs is not None:
            assert_attachments_match(effective_requirements(raw_reqs), attachments)
            return TaskOccurrenceService._pack_attachments(attachments)
        requires_visual = actor.role == roles.EMPLOYEE or occurrence.photo_required
        assert_completion_media(
            photo_path=photo_path,
            video_path=video_path,
            min_video_seconds=occurrence.min_video_seconds,
            video_duration_seconds=video_duration_seconds,
            requires_visual=bool(requires_visual),
        )
        return {
            "attachments": attachments,
            "photo_path": photo_path,
            "video_path": video_path,
            "audio_path": audio_path,
        }

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
        video_duration_seconds: object | None = None,
        completion_attachments: object | None = None,
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
        if completion_status == task_status.COMPLETION_NOT_DONE:
            raise ValueError("לא ניתן לסמן לא בוצע — שלחו שאלה בצ׳אט המשימה")
        if completion_status != task_status.COMPLETION_DONE:
            raise ValueError("סטטוס סיום לא תקין")
        media = self._validated_completion_media(
            actor,
            occurrence,
            photo_path=photo_path,
            video_path=video_path,
            audio_path=audio_path,
            video_duration_seconds=video_duration_seconds,
            completion_attachments=completion_attachments,
        )

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
                photo_path=media["photo_path"],
                video_path=media["video_path"],
                audio_path=media["audio_path"],
                completion_attachments=media["attachments"],
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
                photo_path=media["photo_path"],
                video_path=media["video_path"],
                audio_path=media["audio_path"],
                completion_attachments=media["attachments"],
                not_completed_reason=reason_clean,
                completed_by_id=actor.user_id,
                manager_review_status=task_status.REVIEW_PENDING if needs_review else None,
            )
        assert completion is not None

        if employee_submission and (media["audio_path"] or "").strip():
            manager_lang = self._manager_language(occurrence)
            employee_lang = "he"
            if self._users:
                submitter = self._users.find_by_id(actor.user_id)
                if submitter and submitter.preferred_language:
                    employee_lang = submitter.preferred_language
            transcript = await transcribe_completion_audio(
                media["audio_path"],
                manager_language=manager_lang,
            )
            manager_text = transcript_or_unavailable(transcript, manager_lang)
            if (transcript or "").strip():
                employee_transcript = await localize_completion_transcript(
                    manager_text,
                    source_language=normalize_employee_language(manager_lang),
                    target_language=normalize_employee_language(employee_lang),
                )
                employee_transcript = (employee_transcript or "").strip() or manager_text
            else:
                employee_transcript = transcription_unavailable_message(employee_lang)
            updated_completion = self._completions.update_audio_transcripts(
                occurrence_id,
                audio_transcript=manager_text,
                audio_transcript_employee=employee_transcript,
            )
            if updated_completion:
                completion = updated_completion

        if needs_review:
            new_status = task_status.PENDING_REVIEW
        else:
            new_status = task_status.COMPLETED

        updated = self._occurrences.update_status(occurrence_id, new_status)
        assert updated is not None
        if new_status == task_status.COMPLETED:
            self._media_retention.schedule_purge(occurrence_id)
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
        self._media_retention.schedule_purge(occurrence_id)
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

    def cancel_occurrence(
        self, actor: ActorContext, occurrence_id: str, *, apply_to_network: bool = False
    ) -> dict:
        """ביטול = suppression complète (DB + médias storage)."""
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה לבטל משימות")
        occurrence = self._occurrences.find_by_id(occurrence_id)
        if not occurrence:
            raise ValueError("משימה לא נמצאה")
        self._assert_branch_access(actor, occurrence.branch_id)
        targets = self._cancel_targets(actor, occurrence, apply_to_network)
        snapshots: list[dict] = []
        media: list[str] = []
        for occ in targets:
            snap = self._hard_delete_occurrence(occ)
            media.extend(snap.pop("_media_to_delete", []) or [])
            snapshots.append(snap)
        primary = dict(snapshots[0])
        primary["deleted"] = True
        primary["deleted_count"] = len(snapshots)
        primary["cancelled_occurrences"] = snapshots
        primary["_media_to_delete"] = media
        return primary

    def _cancel_targets(self, actor, occurrence, apply_to_network: bool) -> list:
        if apply_to_network and occurrence.task_kind == AD_HOC:
            if not can_edit_network_fixed_group(actor.role):
                raise PermissionError("מחיקה לכל הרשת למנהל רשת בלבד")
            open_ones = [
                o
                for o in self._group_occurrences_in_scope(actor, occurrence)
                if o.status not in task_status.TERMINAL
            ]
            if open_ones:
                return open_ones
        if occurrence.status in task_status.TERMINAL:
            raise ValueError("המשימה כבר נסגרה")
        return [occurrence]

    def _hard_delete_occurrence(self, occurrence) -> dict:
        snapshot = self._to_api(occurrence)
        media_to_delete = self._media_retention.collect_deletable_media_urls(occurrence.id)
        self._completions.delete_by_occurrence(occurrence.id)
        if self._notifications:
            self._notifications.clear_occurrence_links(occurrence.id)
        if not self._occurrences.delete(occurrence.id):
            raise ValueError("משימה לא נמצאה")
        snapshot["status"] = task_status.CANCELLED
        snapshot["deleted"] = True
        snapshot["_media_to_delete"] = media_to_delete
        return snapshot

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
        min_video_seconds: int | None = None,
        update_min_video_seconds: bool = False,
        completion_requirements: object | None = None,
        update_completion_requirements: bool = False,
        reference_photo_url: str | None | object = _UNSET,
        reference_video_url: str | None | object = _UNSET,
        reference_audio_url: str | None | object = _UNSET,
        apply_to_network: bool = False,
    ) -> dict:
        occurrence = self._require_editable_occurrence(actor, occurrence_id, title)
        parsed = datetime.fromisoformat(due_at)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=TZ)
        details = self._edit_details(
            occurrence,
            title,
            description,
            parsed,
            photo_required,
            min_video_seconds,
            update_min_video_seconds,
            completion_requirements,
            update_completion_requirements,
            reference_photo_url,
            reference_video_url,
            reference_audio_url,
        )
        if apply_to_network and occurrence.task_kind == AD_HOC:
            return self._update_network_ad_hoc(actor, occurrence, details, assignee_user_id)
        assignee = self._resolve_edit_assignee(actor, occurrence, assignee_user_id)
        updated = self._occurrences.update_details(
            occurrence.id, assignee_user_id=assignee, **details
        )
        assert updated is not None
        return self._to_api(updated)

    def _require_editable_occurrence(self, actor, occurrence_id: str, title: str):
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
        return occurrence

    @staticmethod
    def _edit_details(
        occurrence, title, description, due_at, photo_required, min_video_seconds,
        update_min_video_seconds, completion_requirements, update_completion_requirements,
        reference_photo_url, reference_video_url, reference_audio_url,
    ) -> dict:
        media = TaskOccurrenceService._edit_media_fields(
            occurrence,
            photo_required=photo_required,
            min_video_seconds=min_video_seconds,
            update_min_video_seconds=update_min_video_seconds,
            completion_requirements=completion_requirements,
            update_completion_requirements=update_completion_requirements,
        )
        return {
            "title": title,
            "description": description,
            "due_at": due_at,
            **media,
            "reference_photo_url": (
                reference_photo_url if reference_photo_url is not _UNSET else None
            ),
            "reference_video_url": (
                reference_video_url if reference_video_url is not _UNSET else None
            ),
            "reference_audio_url": (
                reference_audio_url if reference_audio_url is not _UNSET else None
            ),
            "update_reference_photo": reference_photo_url is not _UNSET,
            "update_reference_video": reference_video_url is not _UNSET,
            "update_reference_audio": reference_audio_url is not _UNSET,
        }

    @staticmethod
    def _edit_media_fields(
        occurrence,
        *,
        photo_required,
        min_video_seconds,
        update_min_video_seconds,
        completion_requirements,
        update_completion_requirements,
    ) -> dict:
        if update_completion_requirements:
            reqs = parse_requirements_input(completion_requirements, provided=True)
        elif update_min_video_seconds:
            reqs = parse_requirements_input(
                None,
                provided=False,
                photo_required=occurrence.photo_required if photo_required is None else photo_required,
                min_video_seconds=min_video_seconds,
            )
        else:
            return {
                "photo_required": photo_required,
                "min_video_seconds": None,
                "update_min_video_seconds": False,
                "completion_requirements": None,
                "update_completion_requirements": False,
            }
        packed = packed_media_fields(reqs)
        packed["update_min_video_seconds"] = True
        packed["update_completion_requirements"] = True
        return packed

    def _resolve_edit_assignee(self, actor, occurrence, assignee_user_id: str | None):
        if occurrence.pending_delegation:
            if assignee_user_id:
                self._validate_employee(occurrence.branch_id, assignee_user_id)
            return assignee_user_id
        if assignee_user_id:
            self._validate_employee(occurrence.branch_id, assignee_user_id)
            return assignee_user_id
        if occurrence.task_kind == AD_HOC and actor.role == roles.BRANCH_MANAGER:
            raise ValueError("נדרש שיוך לעובד")
        return occurrence.assignee_user_id

    def _update_network_ad_hoc(self, actor, existing, details: dict, assignee_user_id) -> dict:
        if not can_edit_network_fixed_group(actor.role):
            raise PermissionError("עדכון לכל הרשת למנהל רשת בלבד")
        targets = [
            o
            for o in self._group_occurrences_in_scope(actor, existing)
            if o.status not in task_status.TERMINAL
            and o.status != task_status.PENDING_REVIEW
        ]
        primary = None
        for sibling in targets:
            keep = sibling.id != existing.id
            assignee = sibling.assignee_user_id if keep else self._resolve_edit_assignee(
                actor, existing, assignee_user_id
            )
            updated = self._occurrences.update_details(
                sibling.id, assignee_user_id=assignee, **details
            )
            if sibling.id == existing.id:
                primary = updated
        if primary is None:
            raise ValueError("לא ניתן לערוך משימה זו")
        result = self._to_api(primary)
        result["updated_count"] = len(targets)
        return result

    def _group_occurrences_in_scope(self, actor, existing) -> list:
        visible = visible_branch_ids_for_tasks(actor, self._branch)
        if existing.network_group_id:
            siblings = self._occurrences.list_by_network_group(existing.network_group_id)
            return self._visible_or_self(siblings, visible, existing)
        parsed = datetime.fromisoformat(existing.due_at)
        candidates = self._occurrences.list_occurrences(
            branch_ids=visible,
            task_kind=AD_HOC,
            due_on=parsed.date(),
        )
        return siblings_by_occurrence_content(existing, candidates)

    @staticmethod
    def _visible_or_self(siblings, visible, existing) -> list:
        if visible is None:
            return siblings or [existing]
        in_scope = [s for s in siblings if s.branch_id in visible]
        return in_scope or [existing]

    def get_occurrence(self, actor: ActorContext, occurrence_id: str) -> dict:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה לצפות במשימות")
        occurrence = self._occurrences.find_by_id(occurrence_id)
        if not occurrence:
            raise ValueError("משימה לא נמצאה")
        self._assert_branch_access(actor, occurrence.branch_id)
        # Fusion lecture seule (template) — ne pas persister les URLs template sur l'occurrence
        # (sinon cancel/purge supprimerait les fichiers du modèle récurrent).
        return self._to_api(occurrence)

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
        if not user or user.role != roles.EMPLOYEE:
            raise ValueError("עובד לא שייך לסניף")
        member_ids = UserBranchMembershipRepository(self._users._db).list_branch_ids_for_user(
            user.id
        )
        if not employee_belongs_to_branch(
            primary_branch_id=user.branch_id,
            membership_branch_ids=member_ids,
            branch_id=branch_id,
        ):
            raise ValueError("עובד לא שייך לסניף")

    def _assert_can_complete(self, actor: ActorContext, occurrence) -> None:
        if can_manage_tasks(actor):
            self._assert_branch_access(actor, occurrence.branch_id)
            return
        if not employee_can_see_occurrence(
            actor, assignee_user_id=occurrence.assignee_user_id, branch_id=occurrence.branch_id
        ):
            raise PermissionError("אין הרשאה לבצע משימה זו")

    def _to_api(self, occurrence, *, already_in_gallery: bool | None = None) -> dict:
        in_gallery = set()
        if already_in_gallery:
            in_gallery.add(occurrence.id)
        elif already_in_gallery is None and self._gallery:
            if self._gallery.find_by_source_occurrence_id(occurrence.id):
                in_gallery.add(occurrence.id)
        return self._occurrences_to_api([occurrence], in_gallery=in_gallery)[0]

    def _occurrences_to_api(
        self,
        items: list,
        *,
        in_gallery: set[str] | None = None,
    ) -> list[dict]:
        """Serialize many occurrences with batched lookups (avoids N+1)."""
        if not items:
            return []
        gallery_ids = in_gallery or set()
        completions = self._completions.find_by_occurrence_ids([o.id for o in items])
        template_ids = list({o.template_id for o in items if o.template_id})
        templates = (
            self._templates.find_by_ids(template_ids)
            if self._templates and template_ids
            else {}
        )
        branch_ids = {o.branch_id for o in items if o.branch_id}
        department_ids = {o.department_id for o in items if o.department_id}
        user_ids = {
            uid
            for o in items
            for uid in (o.assignee_user_id, o.manager_user_id)
            if uid
        }
        branch_names, department_names, user_names = self._occurrences.lookup_display_names(
            branch_ids=branch_ids,
            department_ids=department_ids,
            user_ids=user_ids,
        )
        rows: list[dict] = []
        grouped = grouped_occurrence_ids(items)
        for occurrence in items:
            template = templates.get(occurrence.template_id) if occurrence.template_id else None
            occurrence = merge_occurrence_reference_media(occurrence, template)
            completion = completions.get(occurrence.id)
            already = occurrence.id in gallery_ids
            rows.append(
                mp.task_occurrence_domain_to_api(
                    occurrence,
                    branch_name=branch_names.get(occurrence.branch_id),
                    department_name=(
                        department_names.get(occurrence.department_id)
                        if occurrence.department_id
                        else None
                    ),
                    assignee_name=(
                        user_names.get(occurrence.assignee_user_id)
                        if occurrence.assignee_user_id
                        else None
                    ),
                    manager_name=(
                        user_names.get(occurrence.manager_user_id)
                        if occurrence.manager_user_id
                        else None
                    ),
                    completion=(
                        mp.task_completion_domain_to_api(completion) if completion else None
                    ),
                    in_gallery=already,
                    can_add_to_gallery=can_add_occurrence_to_gallery(
                        source_gallery_item_id=occurrence.source_gallery_item_id,
                        already_in_gallery=already,
                    ),
                    is_network_task=occurrence.id in grouped,
                )
            )
        return rows

    def _with_reference_media(self, occurrence):
        if not occurrence.template_id or not self._templates:
            return occurrence
        template = self._templates.find_by_id(occurrence.template_id)
        return merge_occurrence_reference_media(occurrence, template)
