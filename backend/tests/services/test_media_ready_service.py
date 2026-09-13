from unittest.mock import MagicMock

from app.models.task_completion import TaskCompletion
from app.services.media_ready_service import MediaReadyService


def _completion(**overrides) -> TaskCompletion:
    base = {
        "id": "cmp-1",
        "occurrence_id": "occ-1",
        "status": "completed",
        "note": None,
        "photo_path": None,
        "video_path": "https://x.private.blob.vercel-storage.com/v.mp4",
        "audio_path": None,
        "not_completed_reason": None,
        "completed_by_id": "emp-1",
        "completed_at": "2026-01-01T10:00:00+02:00",
        "completion_attachments": [
            {
                "kind": "video",
                "url": "https://x.private.blob.vercel-storage.com/v.mp4",
                "duration_seconds": 10,
            }
        ],
        "media_ready": False,
    }
    base.update(overrides)
    return TaskCompletion(**base)


def test_initial_ready_true_without_videos():
    svc = MediaReadyService(MagicMock(), lambda _url: False)
    assert svc.initial_ready([{"kind": "photo", "url": "/p.jpg"}]) is True


def test_promote_occurrence_stays_pending_until_probe_passes():
    repo = MagicMock()
    pending = _completion()
    repo.find_by_occurrence.return_value = pending
    svc = MediaReadyService(repo, lambda _url: False)
    assert svc.promote_occurrence("occ-1") is False
    repo.set_media_ready.assert_not_called()


def test_promote_occurrence_flips_when_readable():
    repo = MagicMock()
    repo.find_by_occurrence.return_value = _completion()
    repo.set_media_ready.return_value = _completion(media_ready=True)
    svc = MediaReadyService(repo, lambda _url: True)
    assert svc.promote_occurrence("occ-1") is True
    repo.set_media_ready.assert_called_once_with("occ-1", True)


def test_promote_pending_returns_flipped_ids():
    repo = MagicMock()
    repo.list_not_ready_for_review.return_value = [_completion()]
    repo.find_by_occurrence.return_value = _completion()
    repo.set_media_ready.return_value = _completion(media_ready=True)
    svc = MediaReadyService(repo, lambda _url: True)
    assert svc.promote_pending() == ["occ-1"]
