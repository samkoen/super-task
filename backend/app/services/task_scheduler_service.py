"""Génération d'occurrences et marquage overdue."""
from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.domain import task_recurrence, task_status
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.task_template_repository import TaskTemplateRepository

TZ = ZoneInfo("Asia/Jerusalem")


class TaskSchedulerService:
    def __init__(
        self,
        template_repo: TaskTemplateRepository,
        occurrence_repo: TaskOccurrenceRepository,
    ):
        self._templates = template_repo
        self._occurrences = occurrence_repo

    def run_for_date(self, on_date: date | None = None) -> dict:
        day = on_date or datetime.now(TZ).date()
        generated = self._generate_occurrences(day)
        overdue = self._mark_overdue()
        return {"generated": generated, "overdue_marked": overdue, "date": day.isoformat()}

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
            reference_photo_url=template.reference_photo_url,
            reference_video_url=template.reference_video_url,
            reference_audio_url=template.reference_audio_url,
            created_by_id=template.created_by_id,
        )

    def create_once_occurrence(self, template, *, due_at: datetime | None = None) -> None:
        if due_at is None:
            day = datetime.now(TZ).date()
            due_at = task_recurrence.due_at_for_date(day, template.due_time)
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
            reference_photo_url=template.reference_photo_url,
            reference_video_url=template.reference_video_url,
            reference_audio_url=template.reference_audio_url,
            created_by_id=template.created_by_id,
        )

    def _generate_occurrences(self, day: date) -> int:
        count = 0
        for template in self._templates.list_active_recurring():
            if self.generate_from_template(template, on_date=day):
                count += 1
        return count

    def _mark_overdue(self) -> int:
        return self._occurrences.mark_overdue_before(datetime.now(TZ))
