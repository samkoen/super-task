"""list_occurrences must batch lookups instead of N+1 per task."""
from unittest.mock import MagicMock
from uuid import uuid4

from app.domain import roles
from app.domain.scope import ActorContext
from app.models.task_occurrence import TaskOccurrence
from app.services import task_occurrence_service as mod
from app.services.task_occurrence_service import TaskOccurrenceService


def _occ(i: int) -> TaskOccurrence:
    return TaskOccurrence(
        id=str(uuid4()),
        template_id=str(uuid4()),
        branch_id=str(uuid4()),
        title=f"T{i}",
        description="",
        due_at="2026-07-20T10:00:00+03:00",
        status="pending",
        assignee_user_id=str(uuid4()),
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
        created_by_id=str(uuid4()),
        created_at="2026-07-20T09:00:00+03:00",
        updated_at="2026-07-20T09:00:00+03:00",
    )


def test_list_occurrences_batches_names_and_completions():
    items = [_occ(0), _occ(1), _occ(2)]
    occurrence_repo = MagicMock()
    occurrence_repo.list_occurrences.return_value = items
    occurrence_repo.lookup_display_names.return_value = (
        {o.branch_id: "Branch" for o in items},
        {},
        {o.assignee_user_id: "Worker" for o in items if o.assignee_user_id},
    )
    completion_repo = MagicMock()
    completion_repo.find_by_occurrence_ids.return_value = {}
    branch_repo = MagicMock()
    template_repo = MagicMock()
    template_repo.find_by_ids.return_value = {}
    gallery_repo = MagicMock()
    gallery_repo.source_occurrence_ids_in.return_value = set()

    service = TaskOccurrenceService(
        occurrence_repo,
        completion_repo,
        branch_repo,
        template_repo=template_repo,
        gallery_repo=gallery_repo,
    )
    actor = ActorContext(
        user_id=str(uuid4()),
        role=roles.NETWORK_MANAGER,
        network_id=str(uuid4()),
    )

    original = mod.visible_branch_ids_for_tasks
    mod.visible_branch_ids_for_tasks = lambda _a, _b: [items[0].branch_id]
    try:
        rows = service.list_occurrences(actor, due_on="2026-07-20")
    finally:
        mod.visible_branch_ids_for_tasks = original

    assert len(rows) == 3
    completion_repo.find_by_occurrence_ids.assert_called_once()
    occurrence_repo.lookup_display_names.assert_called_once()
    template_repo.find_by_ids.assert_called_once()
    occurrence_repo.get_branch_name.assert_not_called()
    completion_repo.find_by_occurrence.assert_not_called()
