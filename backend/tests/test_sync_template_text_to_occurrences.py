"""Propagation titre/description template → occurrences ouvertes."""
from unittest.mock import MagicMock

from app.domain import task_status
from app.models.task_occurrence import TaskOccurrence
from app.models.task_template import TaskTemplate
from app.services.task_template_service import TaskTemplateService


def _tpl() -> TaskTemplate:
    return TaskTemplate(
        id="tpl-1",
        branch_id="b1",
        title="כותרת",
        description="תמלול",
        recurrence="daily",
        due_time="09:00",
        weekly_days=None,
        monthly_day=None,
        assignee_user_id="e1",
        department_id=None,
        task_kind="fixed",
        photo_required=False,
        reference_photo_url=None,
        reference_video_url=None,
        reference_audio_url=None,
        biweekly_anchor=None,
        is_active=True,
        created_by_id="m1",
        created_at="2026-08-18",
        updated_at="2026-08-18",
    )


def _occ(*, status: str, id_: str) -> TaskOccurrence:
    return TaskOccurrence(
        id=id_,
        template_id="tpl-1",
        branch_id="b1",
        title="ישן",
        description="",
        due_at="2026-08-18T09:00:00+03:00",
        status=status,
        assignee_user_id="e1",
        department_id=None,
        task_kind="fixed",
        manager_user_id=None,
        photo_required=False,
        reference_photo_url=None,
        reference_video_url=None,
        reference_audio_url=None,
        media_purge_after=None,
        started_at=None,
        started_by_id=None,
        created_by_id="m1",
        created_at="2026-08-18",
        updated_at="2026-08-18",
    )


def test_sync_updates_open_occurrences_only():
    occ_repo = MagicMock()
    occ_repo.list_by_template_id.return_value = [
        _occ(status=task_status.PENDING, id_="open"),
        _occ(status=task_status.COMPLETED, id_="done"),
        _occ(status=task_status.PENDING_REVIEW, id_="review"),
    ]
    svc = TaskTemplateService(
        MagicMock(),
        MagicMock(),
        MagicMock(),
        MagicMock(),
        MagicMock(),
        occurrence_repo=occ_repo,
    )
    svc._sync_open_occurrence_text(_tpl())
    occ_repo.update_title_description.assert_called_once_with(
        "open", title="כותרת", description="תמלול"
    )
    occ_repo.update_completion_requirements.assert_called_once_with("open", [])


def test_sync_copies_slot_guides_to_open_occurrence():
    occ_repo = MagicMock()
    occ_repo.list_by_template_id.return_value = [_occ(status=task_status.PENDING, id_="open")]
    svc = TaskTemplateService(
        MagicMock(),
        MagicMock(),
        MagicMock(),
        MagicMock(),
        MagicMock(),
        occurrence_repo=occ_repo,
    )
    guides = [{"kind": "photo", "title": "מדף", "hint": "הסבר", "example_url": "/ex.jpg"}]
    tpl = _tpl()
    tpl.completion_requirements = guides
    svc._sync_open_occurrence_text(tpl)
    occ_repo.update_completion_requirements.assert_called_once_with("open", guides)
