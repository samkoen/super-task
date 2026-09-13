"""Passe media_ready quand Blob sert vraiment les vidéos de complétion."""
from __future__ import annotations

from app.domain.completion_media import completion_videos_are_ready
from app.repositories.task_completion_repository import TaskCompletionRepository


class MediaReadyService:
    def __init__(self, completions: TaskCompletionRepository, probe) -> None:
        self._completions = completions
        self._probe = probe

    def initial_ready(self, attachments: list | None) -> bool:
        return completion_videos_are_ready(attachments or [], self._probe)

    def promote_occurrence(self, occurrence_id: str) -> bool:
        completion = self._completions.find_by_occurrence(occurrence_id)
        if not completion:
            return True
        if completion.media_ready:
            return True
        if not self.initial_ready(completion.completion_attachments):
            return False
        updated = self._completions.set_media_ready(occurrence_id, True)
        return bool(updated and updated.media_ready)

    def promote_pending(self, *, limit: int = 40) -> list[str]:
        promoted: list[str] = []
        for completion in self._completions.list_not_ready_for_review(limit=limit):
            if self.promote_occurrence(completion.occurrence_id):
                promoted.append(completion.occurrence_id)
        return promoted
