"""Rétention médias tâche : TTL après validation manager, puis purge Blob/local."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.core import config
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
    ):
        self._occurrences = occurrence_repo
        self._completions = completion_repo
        self._templates = template_repo

    def schedule_purge(self, occurrence_id: str, *, now: datetime | None = None) -> datetime:
        when = now or datetime.now(TZ)
        purge_after = when + timedelta(hours=config.MEDIA_RETENTION_HOURS)
        self._occurrences.set_media_purge_after(occurrence_id, purge_after)
        return purge_after

    def purge_due(self, *, now: datetime | None = None) -> dict:
        moment = now or datetime.now(TZ)
        due = self._occurrences.list_due_for_media_purge(moment)
        purged = 0
        for occurrence in due:
            if self._purge_one(occurrence.id):
                purged += 1
        return {"purged": purged, "checked": len(due), "at": moment.isoformat()}

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
        if completion:
            urls.extend(
                [completion.photo_path, completion.video_path, completion.audio_path]
            )
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
        return {
            u
            for u in (
                template.reference_photo_url,
                template.reference_video_url,
                template.reference_audio_url,
            )
            if u
        }

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
