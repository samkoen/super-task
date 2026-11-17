"""duration_minutes : validation, propagation template → occurrences, édition, réseau."""
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.domain import roles, task_status
from app.domain.network_edit_diff import merge_template_network_payload
from app.domain.task_duration import normalize_duration_minutes
from app.services.task_occurrence_service import TaskOccurrenceService
from app.services.task_scheduler_service import TaskSchedulerService
from app.services.task_template_service import TaskTemplateService
from tests.occurrence_batch_stubs import stub_occurrence_batch_lookups
from tests.test_sync_template_text_to_occurrences import _occ, _tpl


@pytest.mark.parametrize("raw", [None, "", "  ", 0, False, -5])
def test_normalize_empty_means_no_duration(raw):
    assert normalize_duration_minutes(raw) is None


@pytest.mark.parametrize("raw,expected", [(15, 15), ("30", 30), (480, 480), (20.0, 20)])
def test_normalize_valid_minutes(raw, expected):
    assert normalize_duration_minutes(raw) == expected


@pytest.mark.parametrize("raw", [481, "abc", 12.5])
def test_normalize_rejects_invalid(raw):
    with pytest.raises(ValueError):
        normalize_duration_minutes(raw)


def test_sync_copies_duration_to_open_occurrences_only():
    occ_repo = MagicMock()
    occ_repo.list_by_template_id.return_value = [
        _occ(status=task_status.PENDING, id_="open"),
        _occ(status=task_status.COMPLETED, id_="done"),
    ]
    svc = TaskTemplateService(
        MagicMock(), MagicMock(), MagicMock(), MagicMock(), MagicMock(), occurrence_repo=occ_repo
    )
    tpl = _tpl()
    tpl.duration_minutes = 15
    svc._sync_open_occurrence_text(tpl)
    occ_repo.update_duration_minutes.assert_called_once_with("open", 15)


def test_template_edit_payload_keeps_duration_unless_sent():
    existing = _tpl()
    existing.duration_minutes = 10
    base = dict(
        title="t", description="", due_time="09:00", weekly_days=None, is_active=True,
        reference_photo_url=None, reference_video_url=None, reference_audio_url=None,
        ops_category=None, update_ops_category=False, min_video_seconds=None,
        update_min_video_seconds=False, completion_requirements=None,
        update_completion_requirements=False, is_work_start=None, is_work_end=None,
        start_url=None,
    )
    kept = TaskTemplateService._edit_payload(existing, **base)
    assert kept["duration_minutes"] == 10
    assert kept["update_duration_minutes"] is False
    changed = TaskTemplateService._edit_payload(
        existing, **base, duration_minutes="25", update_duration_minutes=True
    )
    assert changed["duration_minutes"] == 25
    assert changed["update_duration_minutes"] is True
    cleared = TaskTemplateService._edit_payload(
        existing, **base, duration_minutes=None, update_duration_minutes=True
    )
    assert cleared["duration_minutes"] is None


def test_network_merge_keeps_sibling_duration_when_unchanged():
    existing = SimpleNamespace(
        title="t", description="", due_time="09:00", weekly_days=None, is_active=True,
        is_work_start=False, is_work_end=False, reference_photo_url=None,
        reference_video_url=None, reference_audio_url=None, ops_category=None,
        start_url=None, completion_requirements=[], min_video_seconds=None,
        photo_required=False, duration_minutes=10,
    )
    sibling = SimpleNamespace(**{**vars(existing), "duration_minutes": 20})
    same = merge_template_network_payload(
        existing, {"title": "t", "duration_minutes": 10, "update_duration_minutes": True}, sibling
    )
    assert same["duration_minutes"] == 20
    assert same["update_duration_minutes"] is False
    new = merge_template_network_payload(
        existing, {"title": "t", "duration_minutes": 30, "update_duration_minutes": True}, sibling
    )
    assert new["duration_minutes"] == 30
    assert new["update_duration_minutes"] is True


def _occurrence_service():
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
    actor = MagicMock()
    actor.user_id = "m1"
    actor.role = roles.BRANCH_MANAGER
    actor.branch_id = "b1"
    return TaskOccurrenceService(repo, completion_repo, MagicMock(), users), repo, actor


def test_scheduler_copies_template_duration_to_new_occurrence(monkeypatch):
    from datetime import date

    monkeypatch.setattr(
        "app.services.task_scheduler_service.blob_storage.copy_media_url", lambda url, folder: url
    )
    occ_repo = MagicMock()
    occ_repo.exists_for_template_on_date.return_value = False
    tpl = _tpl()
    tpl.duration_minutes = 25
    TaskSchedulerService(MagicMock(), occ_repo).generate_from_template(tpl, on_date=date(2026, 8, 18))
    assert occ_repo.create.call_args.kwargs["duration_minutes"] == 25

    occ_repo.reset_mock()
    TaskSchedulerService(MagicMock(), occ_repo).create_once_occurrence(tpl)
    assert occ_repo.create.call_args.kwargs["duration_minutes"] == 25


def test_network_merge_occurrence_details_overlays_duration():
    from app.domain.network_edit_diff import merge_occurrence_network_details

    existing = SimpleNamespace(
        title="t", description="", due_at="2026-08-18T09:00:00+03:00",
        reference_photo_url=None, reference_video_url=None, reference_audio_url=None,
        start_url=None, completion_requirements=[], min_video_seconds=None,
        photo_required=False, duration_minutes=10,
    )
    sibling = SimpleNamespace(**{**vars(existing), "duration_minutes": None})
    details = {"title": "t", "due_at": existing.due_at, "duration_minutes": 40, "update_duration_minutes": True}
    merged = merge_occurrence_network_details(existing, details, sibling)
    assert merged["duration_minutes"] == 40
    untouched = merge_occurrence_network_details(
        existing, {"title": "t", "due_at": existing.due_at, "update_duration_minutes": False}, sibling
    )
    assert untouched["duration_minutes"] is None
    assert untouched["update_duration_minutes"] is False


def test_create_ad_hoc_normalizes_duration_before_saving():
    svc, repo, actor = _occurrence_service()
    repo.create.return_value = repo.find_by_id.return_value
    svc._assert_can_create_ad_hoc = MagicMock()
    svc._assert_branch_access = MagicMock()
    svc._validate_employee = MagicMock()
    svc.create_ad_hoc(
        actor, branch_id="b1", title="t", due_at="2026-07-14T12:00:00+03:00",
        assignee_user_id="u1", photo_required=False, duration_minutes="15",
    )
    assert repo.create.call_args.kwargs["duration_minutes"] == 15
    with pytest.raises(ValueError):
        svc.create_ad_hoc(
            actor, branch_id="b1", title="t", due_at="2026-07-14T12:00:00+03:00",
            assignee_user_id="u1", photo_required=False, duration_minutes=900,
        )


def test_update_occurrence_saves_duration_only_when_sent():
    svc, repo, actor = _occurrence_service()
    common = dict(title="Updated", description="", due_at="2026-07-14T12:00:00+03:00", assignee_user_id="u1")
    svc.update_occurrence(actor, "occ-1", **common)
    assert repo.update_details.call_args.kwargs["update_duration_minutes"] is False
    svc.update_occurrence(actor, "occ-1", **common, duration_minutes=15, update_duration_minutes=True)
    kwargs = repo.update_details.call_args.kwargs
    assert kwargs["duration_minutes"] == 15
    assert kwargs["update_duration_minutes"] is True
