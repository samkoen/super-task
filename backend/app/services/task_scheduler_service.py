"""Génération d'occurrences et marquage overdue."""
from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.domain import task_recurrence, task_status
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.task_template_repository import TaskTemplateRepository
from app.repositories.task_completion_repository import TaskCompletionRepository
from app.services import blob_storage
from app.services.fixed_task_expiry import close_expired_fixed_occurrences

TZ = ZoneInfo("Asia/Jerusalem")


class TaskSchedulerService:
    def __init__(
        self,
        template_repo: TaskTemplateRepository,
        occurrence_repo: TaskOccurrenceRepository,
        completion_repo: TaskCompletionRepository | None = None,
    ):
        self._templates = template_repo
        self._occurrences = occurrence_repo
        self._completions = completion_repo

    def run_for_date(self, on_date: date | None = None) -> dict:
        day = on_date or datetime.now(TZ).date()
        now = datetime.now(TZ)
        expired = close_expired_fixed_occurrences(
            self._occurrences, self._completions, day
        )
        generated = self._generate_occurrences(day)
        rolled = self._occurrences.rollover_open_tasks_to_day(day, now=now)
        overdue = self._mark_overdue()
        return {
            "generated": generated,
            "expired_fixed": expired,
            "rolled_forward": rolled,
            "overdue_marked": overdue,
            "date": day.isoformat(),
        }

    def generate_from_template(self, template, *, on_date: date):
        anchor = None
        if template.biweekly_anchor:
            anchor = datetime.fromisoformat(template.biweekly_anchor).date()
        if not task_recurrence.should_generate_on_date(
            template.recurrence,
            template.weekly_days,
            on_date,
            anchor_date=anchor,
            monthly_day=template.monthly_day,
        ):
            return None
        if self._occurrences.exists_for_template_on_date(template.id, on_date):
            return None
        due_at = task_recurrence.due_at_for_date(on_date, template.due_time)
        photo, video, audio = self._copy_reference_media(template)
        return self._occurrences.create(
            template_id=template.id,
            branch_id=template.branch_id,
            title=template.title,
            description=template.description,
            due_at=due_at,
            assignee_user_id=template.assignee_user_id,
            department_id=template.department_id,
            task_kind=template.task_kind,
            photo_required=template.photo_required,
            min_video_seconds=getattr(template, "min_video_seconds", None),
            completion_requirements=getattr(template, "completion_requirements", None),
            is_work_start=bool(getattr(template, "is_work_start", False)),
            is_work_end=bool(getattr(template, "is_work_end", False)),
            start_url=getattr(template, "start_url", None),
            reference_photo_url=photo,
            reference_video_url=video,
            reference_audio_url=audio,
            created_by_id=template.created_by_id,
            ops_category=getattr(template, "ops_category", None),
        )

    def create_once_occurrence(self, template, *, due_at: datetime | None = None) -> None:
        if due_at is None:
            day = datetime.now(TZ).date()
            due_at = task_recurrence.due_at_for_date(day, template.due_time)
        photo, video, audio = self._copy_reference_media(template)
        self._occurrences.create(
            template_id=template.id,
            branch_id=template.branch_id,
            title=template.title,
            description=template.description,
            due_at=due_at,
            assignee_user_id=template.assignee_user_id,
            department_id=template.department_id,
            task_kind=template.task_kind,
            photo_required=template.photo_required,
            min_video_seconds=getattr(template, "min_video_seconds", None),
            completion_requirements=getattr(template, "completion_requirements", None),
            is_work_start=bool(getattr(template, "is_work_start", False)),
            is_work_end=bool(getattr(template, "is_work_end", False)),
            start_url=getattr(template, "start_url", None),
            reference_photo_url=photo,
            reference_video_url=video,
            reference_audio_url=audio,
            created_by_id=template.created_by_id,
            source_gallery_item_id=getattr(template, "source_gallery_item_id", None),
            ops_category=getattr(template, "ops_category", None),
        )

    def _copy_reference_media(self, template) -> tuple[str | None, str | None, str | None]:
        return (
            blob_storage.copy_media_url(template.reference_photo_url, folder="task_photos"),
            blob_storage.copy_media_url(template.reference_video_url, folder="task_videos"),
            blob_storage.copy_media_url(template.reference_audio_url, folder="task_audio"),
        )

    def _generate_occurrences(self, day: date) -> int:
        count = 0
        for template in self._templates.list_active_recurring():
            if self.generate_from_template(template, on_date=day):
                count += 1
        return count

    def _mark_overdue(self) -> int:
        return self._occurrences.mark_overdue_before(datetime.now(TZ))
