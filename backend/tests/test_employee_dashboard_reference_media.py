"""Dashboard oved : médias de référence (Blob) fusionnés depuis le template."""
from __future__ import annotations

from unittest.mock import MagicMock

from app.models.task_occurrence import TaskOccurrence
from app.models.task_template import TaskTemplate
from app.services.dashboard_service import DashboardService


def _occ(**overrides) -> TaskOccurrence:
    base = dict(
        id="occ-1",
        template_id="tpl-1",
        branch_id="b1",
        title="T",
        description="",
        due_at="2026-07-17T12:00:00+03:00",
        status="pending",
        assignee_user_id="e1",
        department_id=None,
        task_kind="fixed",
        manager_user_id="m1",
        photo_required=True,
        reference_photo_url="https://x.private.blob.vercel-storage.com/photo.jpg",
        reference_video_url=None,
        reference_audio_url=None,
        media_purge_after=None,
        started_at=None,
        started_by_id=None,
        created_by_id="m1",
        created_at="2026-07-17T08:00:00+03:00",
        updated_at="2026-07-17T08:00:00+03:00",
    )
    base.update(overrides)
    return TaskOccurrence(**base)


def _tpl(**overrides) -> TaskTemplate:
    base = dict(
        id="tpl-1",
        branch_id="b1",
        title="T",
        description="",
        recurrence="daily",
        due_time="09:00",
        weekly_days=None,
        monthly_day=None,
        assignee_user_id="e1",
        department_id=None,
        task_kind="fixed",
        photo_required=True,
        reference_photo_url="https://x.private.blob.vercel-storage.com/tpl-photo.jpg",
        reference_video_url="https://x.private.blob.vercel-storage.com/tpl-video.mp4",
        reference_audio_url="https://x.private.blob.vercel-storage.com/tpl-audio.webm",
        biweekly_anchor=None,
        is_active=True,
        created_by_id="m1",
        created_at="2026-07-01T00:00:00+03:00",
        updated_at="2026-07-01T00:00:00+03:00",
    )
    base.update(overrides)
    return TaskTemplate(**base)


def test_employee_card_merges_blob_media_from_template():
    occ_repo = MagicMock()
    occ_repo.get_department_name.return_value = None
    tpl_repo = MagicMock()
    tpl_repo.find_by_id.return_value = _tpl()
    completion_repo = MagicMock()
    completion_repo.find_by_occurrence.return_value = None

    svc = DashboardService(
        occ_repo,
        MagicMock(),
        MagicMock(),
        MagicMock(),
        completion_repo,
        template_repo=tpl_repo,
    )
    card = svc._employee_task_card(_occ())

    assert card["reference_photo_url"].endswith("photo.jpg")
    assert card["reference_video_url"].endswith("tpl-video.mp4")
    assert card["reference_audio_url"].endswith("tpl-audio.webm")
    tpl_repo.find_by_id.assert_called_once_with("tpl-1")


def test_employee_card_without_template_keeps_occurrence_blob_urls():
    occ_repo = MagicMock()
    occ_repo.get_department_name.return_value = None
    completion_repo = MagicMock()
    completion_repo.find_by_occurrence.return_value = None

    svc = DashboardService(
        occ_repo,
        MagicMock(),
        MagicMock(),
        MagicMock(),
        completion_repo,
        template_repo=MagicMock(),
    )
    video = "https://x.private.blob.vercel-storage.com/occ-video.mp4"
    card = svc._employee_task_card(
        _occ(template_id=None, reference_video_url=video, reference_audio_url=None)
    )
    assert card["reference_video_url"] == video
    assert card["reference_audio_url"] is None
