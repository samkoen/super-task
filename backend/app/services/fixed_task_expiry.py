"""Ferme les קבועות ouvertes d'hier et enregistre « לא בוצע » système."""
from __future__ import annotations

from datetime import date

from app.domain import task_status
from app.domain.fixed_task_expiry import SYSTEM_NOT_COMPLETED_REASON
from app.models.task_occurrence import TaskOccurrence
from app.repositories.task_completion_repository import TaskCompletionRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository


def close_expired_fixed_occurrences(
    occurrence_repo: TaskOccurrenceRepository,
    completion_repo: TaskCompletionRepository | None,
    day: date,
    *,
    branch_ids: list[str] | None = None,
) -> int:
    expired = occurrence_repo.expire_open_fixed_before(day, branch_ids=branch_ids)
    if not completion_repo:
        return len(expired)
    for occ in expired:
        record_system_not_completed(completion_repo, occ)
    return len(expired)


def record_system_not_completed(
    completion_repo: TaskCompletionRepository,
    occurrence: TaskOccurrence,
) -> None:
    actor_id = occurrence.assignee_user_id or occurrence.created_by_id
    if not actor_id:
        return
    existing = completion_repo.find_by_occurrence(occurrence.id)
    if existing:
        completion_repo.update_submission(
            occurrence.id,
            status=task_status.COMPLETION_NOT_DONE,
            note=existing.note,
            photo_path=existing.photo_path,
            video_path=existing.video_path,
            audio_path=existing.audio_path,
            not_completed_reason=SYSTEM_NOT_COMPLETED_REASON,
            completed_by_id=actor_id,
            manager_review_status=None,
            completion_attachments=existing.completion_attachments,
        )
        return
    completion_repo.create(
        occurrence_id=occurrence.id,
        status=task_status.COMPLETION_NOT_DONE,
        note=None,
        photo_path=None,
        video_path=None,
        audio_path=None,
        not_completed_reason=SYSTEM_NOT_COMPLETED_REASON,
        completed_by_id=actor_id,
        manager_review_status=None,
    )
