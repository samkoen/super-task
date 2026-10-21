"""Rétention médias tâche : TTL après validation manager, puis purge Blob/local."""
from __future__ import annotations

import logging
from collections.abc import Callable
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.domain.completion_media import attachment_urls, requirement_example_urls
from app.domain.media_retention_policy import (
    DEFAULT_RETENTION_DAYS,
    MAX_RETENTION_DAYS,
    MIN_RETENTION_DAYS,
    finished_at,
    media_is_due,
)
from app.repositories.task_completion_repository import TaskCompletionRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.task_template_repository import TaskTemplateRepository
from app.services import blob_storage

logger = logging.getLogger(__name__)
TZ = ZoneInfo("Asia/Jerusalem")


class MediaRetentionService:
    def __init__(
        self,
        occurrence_repo: TaskOccurrenceRepository,
        completion_repo: TaskCompletionRepository,
        template_repo: TaskTemplateRepository | None = None,
        retention_days: Callable[[], int] | None = None,
    ):
        self._occurrences = occurrence_repo
        self._completions = completion_repo
        self._templates = template_repo
        self._retention_days = retention_days or (lambda: DEFAULT_RETENTION_DAYS)

    def schedule_purge(self, occurrence_id: str, *, now: datetime | None = None) -> datetime:
        when = now or datetime.now(TZ)
        purge_after = when + timedelta(days=self._safe_days())
        self._occurrences.set_media_purge_after(occurrence_id, purge_after)
        return purge_after

    def cancel_purge(self, occurrence_id: str) -> None:
        self._occurrences.set_media_purge_after(occurrence_id, None)

    def purge_due(self, *, now: datetime | None = None) -> dict:
        moment = now or datetime.now(TZ)
        days = self._safe_days()
        pending = self._occurrences.list_scheduled_media_purge()
        purged = sum(1 for item in pending if self._purge_if_due(item.id, days, moment))
        return {"purged": purged, "checked": len(pending), "at": moment.isoformat()}

    def _safe_days(self) -> int:
        try:
            days = int(self._retention_days())
        except (TypeError, ValueError):
            return DEFAULT_RETENTION_DAYS
        if days < MIN_RETENTION_DAYS or days > MAX_RETENTION_DAYS:
            return DEFAULT_RETENTION_DAYS
        return days

    def _purge_if_due(self, occurrence_id: str, days: int, now: datetime) -> bool:
        if not self._retention_elapsed(occurrence_id, days, now):
            return False
        return self._purge_one(occurrence_id)

    def _retention_elapsed(self, occurrence_id: str, days: int, now: datetime) -> bool:
        completion = self._completions.find_by_occurrence(occurrence_id)
        if completion is None:
            return True
        anchor = finished_at(completion.manager_reviewed_at, completion.completed_at)
        return media_is_due(anchor, days, now)

    def collect_deletable_media_urls(self, occurrence_id: str) -> list[str]:
        """URLs à supprimer (hors celles encore liées au template)."""
        occurrence = self._occurrences.find_by_id(occurrence_id)
        if not occurrence:
            return []
        completion = self._completions.find_by_occurrence(occurrence_id)
        protected = self._template_media_urls(occurrence.template_id)
        urls: list[str | None] = [
            occurrence.reference_photo_url,
            occurrence.reference_video_url,
            occurrence.reference_audio_url,
        ]
        urls.extend(requirement_example_urls(getattr(occurrence, "completion_requirements", None)))
        if completion:
            urls.extend(
                [completion.photo_path, completion.video_path, completion.audio_path]
            )
            urls.extend(attachment_urls(getattr(completion, "completion_attachments", None)))
        return [u for u in urls if u and u not in protected]

    def delete_stored_media(self, occurrence_id: str) -> list[str]:
        """Supprime fichiers Blob/local de l'occurrence — jamais ceux encore liés au template."""
        deleted: list[str] = []
        for url in self.collect_deletable_media_urls(occurrence_id):
            blob_storage.delete_media_url(url)
            deleted.append(url)
        return deleted

    def delete_media_urls(self, urls: list[str]) -> None:
        for url in urls:
            blob_storage.delete_media_url(url)

    def _template_media_urls(self, template_id: str | None) -> set[str]:
        if not template_id or not self._templates:
            return set()
        template = self._templates.find_by_id(template_id)
        if not template:
            return set()
        urls = {
            u
            for u in (
                template.reference_photo_url,
                template.reference_video_url,
                template.reference_audio_url,
            )
            if u
        }
        urls.update(requirement_example_urls(getattr(template, "completion_requirements", None)))
        return urls

    def _purge_one(self, occurrence_id: str) -> bool:
        deleted = self.delete_stored_media(occurrence_id)
        if not self._occurrences.find_by_id(occurrence_id):
            return False
        self._occurrences.clear_reference_media(occurrence_id)
        completion = self._completions.find_by_occurrence(occurrence_id)
        if completion:
            self._completions.clear_media_paths(occurrence_id)
        self._occurrences.set_media_purge_after(occurrence_id, None)
        logger.info(
            "Purged task media for occurrence %s (%s files)",
            occurrence_id,
            len(deleted),
        )
        return True


def bind_media_retention(db: Session) -> MediaRetentionService:
    from app.repositories.app_setting_repository import AppSettingRepository

    settings = AppSettingRepository(db)
    return MediaRetentionService(
        TaskOccurrenceRepository(db),
        TaskCompletionRepository(db),
        template_repo=TaskTemplateRepository(db),
        retention_days=settings.media_retention_days,
    )
