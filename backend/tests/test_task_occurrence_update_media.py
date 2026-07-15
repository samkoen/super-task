"""Update occurrence ne doit pas effacer le média si absent du payload."""
from unittest.mock import MagicMock

from app.domain import roles
from app.services.task_occurrence_service import TaskOccurrenceService, _UNSET


def test_update_occurrence_skips_reference_media_when_unset():
    occurrence = MagicMock()
    occurrence.id = "occ-1"
    occurrence.branch_id = "b1"
    occurrence.status = "pending"
    occurrence.pending_delegation = False
    occurrence.task_kind = "ad_hoc"
    occurrence.assignee_user_id = "u1"
    occurrence.template_id = None

    employee = MagicMock()
    employee.role = roles.EMPLOYEE
    employee.branch_id = "b1"

    repo = MagicMock()
    repo.find_by_id.return_value = occurrence
    repo.update_details.return_value = occurrence

    users = MagicMock()
    users.find_by_id.return_value = employee

    svc = TaskOccurrenceService(
        repo,
        MagicMock(),
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
