"""Update occurrence ne doit pas effacer le média si absent du payload."""
from unittest.mock import MagicMock

from app.domain import roles
from app.services.task_occurrence_service import TaskOccurrenceService, _UNSET
from tests.occurrence_batch_stubs import stub_occurrence_batch_lookups


def test_update_occurrence_skips_reference_media_when_unset():
    occurrence = MagicMock()
    occurrence.id = "occ-1"
    occurrence.branch_id = "b1"
    occurrence.status = "pending"
    occurrence.pending_delegation = False
    occurrence.task_kind = "ad_hoc"
    occurrence.assignee_user_id = "u1"
    occurrence.template_id = None
    occurrence.department_id = None
    occurrence.manager_user_id = None

    employee = MagicMock()
    employee.role = roles.EMPLOYEE
    employee.branch_id = "b1"

    repo = MagicMock()
    repo.find_by_id.return_value = occurrence
    repo.update_details.return_value = occurrence
    repo.get_branch_name.return_value = "Branch"
    repo.get_department_name.return_value = None
    repo.get_assignee_name.return_value = "Worker"
    repo.get_manager_name.return_value = None

    users = MagicMock()
    users.find_by_id.return_value = employee

    completion_repo = MagicMock()
    completion_repo.find_by_occurrence.return_value = None
    stub_occurrence_batch_lookups(repo, completion_repo)

    svc = TaskOccurrenceService(
        repo,
        completion_repo,
        MagicMock(),
        users,
    )
    actor = MagicMock()
    actor.user_id = "m1"
    actor.role = roles.BRANCH_MANAGER
    actor.branch_id = "b1"

    svc.update_occurrence(
        actor,
        "occ-1",
        title="Updated",
        description="",
        due_at="2026-07-14T12:00:00+03:00",
        assignee_user_id="u1",
        reference_photo_url=_UNSET,
        reference_video_url=_UNSET,
        reference_audio_url=_UNSET,
    )

    kwargs = repo.update_details.call_args.kwargs
    assert kwargs["update_reference_photo"] is False
    assert kwargs["update_reference_video"] is False
    assert kwargs["update_reference_audio"] is False
