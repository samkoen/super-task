"""Rétention et purge des médias après validation manager."""
from __future__ import annotations

from datetime import datetime, timedelta
from unittest.mock import MagicMock
from zoneinfo import ZoneInfo

from app.domain import task_status
from app.models.task_completion import TaskCompletion
from app.models.task_occurrence import TaskOccurrence
from app.services.media_retention_service import MediaRetentionService

TZ = ZoneInfo("Asia/Jerusalem")


def _occurrence(**overrides) -> TaskOccurrence:
    base = {
        "id": "occ-1",
        "template_id": None,
        "branch_id": "b1",
        "title": "T",
        "description": "",
        "due_at": "2026-01-01T09:00:00+02:00",
        "status": task_status.COMPLETED,
        "assignee_user_id": "emp-1",
        "department_id": None,
        "task_kind": "ad_hoc",
        "manager_user_id": "mgr-1",
        "photo_required": False,
        "reference_photo_url": "https://blob.example/ref.jpg",
        "reference_video_url": None,
        "reference_audio_url": "/uploads/task_audio/ref.webm",
        "media_purge_after": None,
        "started_at": None,
        "started_by_id": None,
        "created_by_id": "mgr-1",
        "created_at": "2026-01-01T00:00:00+02:00",
        "updated_at": "2026-01-01T00:00:00+02:00",
    }
    base.update(overrides)
    return TaskOccurrence(**base)


def _completion(**overrides) -> TaskCompletion:
    base = {
        "id": "cmp-1",
        "occurrence_id": "occ-1",
        "status": task_status.COMPLETION_DONE,
        "note": None,
        "photo_path": "https://blob.example/done.jpg",
        "video_path": None,
        "audio_path": None,
        "audio_transcript": None,
        "audio_transcript_employee": None,
        "not_completed_reason": None,
        "manager_review_status": task_status.REVIEW_APPROVED,
        "manager_reviewed_by_id": "mgr-1",
        "manager_reviewed_at": "2026-01-01T10:00:00+02:00",
        "rejection_note": None,
        "completed_by_id": "emp-1",
        "completed_at": "2026-01-01T09:30:00+02:00",
    }
    base.update(overrides)
    return TaskCompletion(**base)


def test_schedule_purge_uses_retention_hours(monkeypatch):
    monkeypatch.setattr("app.services.media_retention_service.config.MEDIA_RETENTION_HOURS", 24)
    occurrence_repo = MagicMock()
    service = MediaRetentionService(occurrence_repo, MagicMock())
    now = datetime(2026, 7, 17, 12, 0, tzinfo=TZ)

    when = service.schedule_purge("occ-1", now=now)

    assert when == now + timedelta(hours=24)
    occurrence_repo.set_media_purge_after.assert_called_once_with("occ-1", when)


def test_purge_due_deletes_reference_and_completion_media(monkeypatch):
    deleted: list[str] = []
    monkeypatch.setattr(
        "app.services.media_retention_service.blob_storage.delete_media_url",
        lambda url: deleted.append(url) if url else None,
    )
    occurrence = _occurrence()
    completion = _completion()
    occurrence_repo = MagicMock()
    occurrence_repo.list_due_for_media_purge.return_value = [occurrence]
    occurrence_repo.find_by_id.return_value = occurrence
    completion_repo = MagicMock()
    completion_repo.find_by_occurrence.return_value = completion

    service = MediaRetentionService(occurrence_repo, completion_repo)
    now = datetime(2026, 7, 18, 13, 0, tzinfo=TZ)
    result = service.purge_due(now=now)

    assert result["purged"] == 1
    assert "https://blob.example/ref.jpg" in deleted
    assert "https://blob.example/done.jpg" in deleted
    assert "/uploads/task_audio/ref.webm" in deleted
    occurrence_repo.clear_reference_media.assert_called_once_with("occ-1")
    completion_repo.clear_media_paths.assert_called_once_with("occ-1")
    occurrence_repo.set_media_purge_after.assert_called_with("occ-1", None)


def test_delete_stored_media_skips_urls_still_on_template(monkeypatch):
    deleted: list[str] = []
    monkeypatch.setattr(
        "app.services.media_retention_service.blob_storage.delete_media_url",
        lambda url: deleted.append(url) if url else None,
    )
    occurrence = _occurrence(
        template_id="tpl-1",
        reference_photo_url="https://blob.example/shared.jpg",
        reference_audio_url="https://blob.example/owned-audio.webm",
    )
    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence
    completion_repo = MagicMock()
    completion_repo.find_by_occurrence.return_value = None
    template_repo = MagicMock()
    template_repo.find_by_id.return_value = MagicMock(
        reference_photo_url="https://blob.example/shared.jpg",
        reference_video_url=None,
        reference_audio_url=None,
    )

    service = MediaRetentionService(occurrence_repo, completion_repo, template_repo)
    deleted_urls = service.delete_stored_media("occ-1")

    assert "https://blob.example/shared.jpg" not in deleted
    assert "https://blob.example/owned-audio.webm" in deleted_urls



def test_purge_due_empty_list():
    occurrence_repo = MagicMock()
    occurrence_repo.list_due_for_media_purge.return_value = []
    service = MediaRetentionService(occurrence_repo, MagicMock())
    result = service.purge_due(now=datetime.now(TZ))
    assert result["purged"] == 0
    assert result["checked"] == 0
