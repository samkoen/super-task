"""Tests — מזדמנות déployées sur tout le réseau."""
from unittest.mock import MagicMock

import pytest

from app.domain import roles, task_status
from app.domain.network_fixed_task import grouped_occurrence_ids
from app.domain.scope import ActorContext
from app.models.branch import Branch
from app.models.task_occurrence import TaskOccurrence
from app.models.user import User
from app.services.task_occurrence_service import TaskOccurrenceService
from tests.occurrence_batch_stubs import stub_occurrence_batch_lookups


def _emp(uid: str, *, created_at: str, branch_id: str = "b1", active: bool = True) -> User:
    return User(
        id=uid,
        email=f"{uid}@t.com",
        first_name=uid,
        last_name="ע",
        role=roles.EMPLOYEE,
        branch_id=branch_id,
        is_active=active,
        created_at=created_at,
    )


def _occ(**overrides) -> TaskOccurrence:
    base = {
        "id": "occ-1",
        "template_id": None,
        "branch_id": "b1",
        "title": "ביקור פתע",
        "description": "",
        "due_at": "2026-08-18T10:00:00+03:00",
        "status": task_status.PENDING,
        "assignee_user_id": "e1",
        "department_id": None,
        "task_kind": "ad_hoc",
        "manager_user_id": None,
        "photo_required": True,
        "reference_photo_url": None,
        "reference_video_url": None,
        "reference_audio_url": None,
        "media_purge_after": None,
        "started_at": None,
        "started_by_id": None,
        "created_by_id": "m1",
        "created_at": "2026-08-18T00:00:00+03:00",
        "updated_at": "2026-08-18T00:00:00+03:00",
        "network_group_id": "g1",
    }
    base.update(overrides)
    return TaskOccurrence(**base)


def _svc(branches, employees_by_branch):
    occ = MagicMock()
    occ.get_branch_name.return_value = "סניף"
    occ.get_department_name.return_value = None
    occ.get_assignee_name.return_value = "עובד"
    occ.get_manager_name.return_value = "מנהל"
    completions = MagicMock()
    completions.find_by_occurrence.return_value = None
    stub_occurrence_batch_lookups(occ, completions)
    branch_repo = MagicMock()
    branch_repo.list_branches.return_value = branches
    branch_repo.find_by_id.side_effect = lambda i: next(
        (b for b in branches if b.id == i), None
    )
    users = MagicMock()

    def list_users(*, role=None, branch_ids=None):
        if not branch_ids:
            return []
        return employees_by_branch.get(branch_ids[0], [])

    users.list_users.side_effect = list_users
    users.find_by_id.side_effect = lambda i: next(
        (u for emps in employees_by_branch.values() for u in emps if u.id == i),
        None,
    )
    users._db = MagicMock()
    svc = TaskOccurrenceService(occ, completions, branch_repo, user_repo=users)
    return svc, occ


def _actor(role=roles.NETWORK_MANAGER) -> ActorContext:
    return ActorContext(user_id="m1", role=role, network_id="n1", branch_id=None)


def test_grouped_occurrence_ids_group_and_content():
    a = _occ(id="a", branch_id="b1", network_group_id="g1")
    b = _occ(id="b", branch_id="b2", network_group_id="g1")
    c = _occ(id="c", branch_id="b1", title="אחר", network_group_id=None)
    d = _occ(id="d", branch_id="b1", network_group_id=None, title="זהה")
    e = _occ(id="e", branch_id="b2", network_group_id=None, title="זהה")
    assert grouped_occurrence_ids([a, b, c, d, e]) == {"a", "b", "d", "e"}


def test_create_ad_hoc_for_network_duplicates(monkeypatch):
    branches = [
        Branch(id="b1", network_id="n1", name="א"),
        Branch(id="b2", network_id="n1", name="ב"),
    ]
    emps = {
        "b1": [_emp("e1", created_at="2026-01-01T00:00:00", branch_id="b1")],
        "b2": [
            _emp("e2b", created_at="2026-03-01T00:00:00", branch_id="b2"),
            _emp("e2a", created_at="2026-01-15T00:00:00", branch_id="b2"),
        ],
    }
    svc, occ = _svc(branches, emps)
    occ.create.side_effect = lambda **kw: _occ(
        id=f"o-{kw['branch_id']}",
        branch_id=kw["branch_id"],
        assignee_user_id=kw["assignee_user_id"],
        title=kw["title"],
        network_group_id=kw.get("network_group_id"),
    )
    monkeypatch.setattr(
        "app.services.task_occurrence_service.UserBranchMembershipRepository",
        lambda db: MagicMock(list_branch_ids_for_user=lambda uid: []),
    )
    result = svc.create_ad_hoc_for_network(
        _actor(), title="ביקור", due_at="2026-08-18T10:00:00+03:00"
    )
    assert len(result["occurrences"]) == 2
    assignees = {c.kwargs["assignee_user_id"] for c in occ.create.call_args_list}
    assert assignees == {"e1", "e2a"}
    groups = {c.kwargs["network_group_id"] for c in occ.create.call_args_list}
    assert len(groups) == 1
    assert None not in groups


def test_create_ad_hoc_for_network_subset(monkeypatch):
    branches = [
        Branch(id="b1", network_id="n1", name="א"),
        Branch(id="b2", network_id="n1", name="ב"),
        Branch(id="b3", network_id="n1", name="ג"),
    ]
    emps = {
        "b1": [_emp("e1", created_at="2026-01-01T00:00:00", branch_id="b1")],
        "b2": [_emp("e2", created_at="2026-01-01T00:00:00", branch_id="b2")],
        "b3": [_emp("e3", created_at="2026-01-01T00:00:00", branch_id="b3")],
    }
    svc, occ = _svc(branches, emps)
    occ.create.side_effect = lambda **kw: _occ(
        id=f"o-{kw['branch_id']}",
        branch_id=kw["branch_id"],
        assignee_user_id=kw["assignee_user_id"],
        network_group_id=kw.get("network_group_id"),
    )
    monkeypatch.setattr(
        "app.services.task_occurrence_service.UserBranchMembershipRepository",
        lambda db: MagicMock(list_branch_ids_for_user=lambda uid: []),
    )
    result = svc.create_ad_hoc_for_network(
        _actor(),
        title="X",
        due_at="2026-08-18T10:00:00+03:00",
        branch_ids=["b3", "b1"],
    )
    assert len(result["occurrences"]) == 2
    created = [c.kwargs["branch_id"] for c in occ.create.call_args_list]
    assert created == ["b3", "b1"]


def test_create_ad_hoc_one_branch_has_no_network_group(monkeypatch):
    branches = [Branch(id="b1", network_id="n1", name="א")]
    emps = {"b1": [_emp("e1", created_at="2026-01-01T00:00:00", branch_id="b1")]}
    svc, occ = _svc(branches, emps)
    occ.create.side_effect = lambda **kw: _occ(
        id="o-local",
        branch_id=kw["branch_id"],
        assignee_user_id=kw["assignee_user_id"],
        title=kw["title"],
        network_group_id=kw.get("network_group_id"),
    )
    monkeypatch.setattr(
        "app.services.task_occurrence_service.UserBranchMembershipRepository",
        lambda db: MagicMock(list_branch_ids_for_user=lambda uid: []),
    )
    svc.create_ad_hoc(
        _actor(),
        branch_id="b1",
        title="מקומית",
        due_at="2026-08-18T10:00:00+03:00",
        assignee_user_id="e1",
    )
    occ.create.assert_called_once()
    assert occ.create.call_args.kwargs["network_group_id"] is None
    assert occ.create.call_args.kwargs["branch_id"] == "b1"


def test_create_ad_hoc_for_network_skips_empty_snif(monkeypatch):
    branches = [
        Branch(id="b1", network_id="n1", name="א"),
        Branch(id="b2", network_id="n1", name="ב"),
    ]
    emps = {
        "b1": [_emp("e1", created_at="2026-01-01T00:00:00", branch_id="b1")],
        "b2": [],
    }
    svc, occ = _svc(branches, emps)
    occ.create.side_effect = lambda **kw: _occ(
        id=f"o-{kw['branch_id']}",
        branch_id=kw["branch_id"],
        assignee_user_id=kw["assignee_user_id"],
        network_group_id=kw.get("network_group_id"),
    )
    monkeypatch.setattr(
        "app.services.task_occurrence_service.UserBranchMembershipRepository",
        lambda db: MagicMock(list_branch_ids_for_user=lambda uid: []),
    )
    result = svc.create_ad_hoc_for_network(
        _actor(), title="X", due_at="2026-08-18T10:00:00+03:00"
    )
    assert len(result["occurrences"]) == 1
    assert result["skipped"][0]["branch_id"] == "b2"
    occ.create.assert_called_once()


def test_create_ad_hoc_for_network_forbidden_for_branch_manager():
    svc, _ = _svc([], {})
    with pytest.raises(PermissionError):
        svc.create_ad_hoc_for_network(
            _actor(roles.BRANCH_MANAGER),
            title="X",
            due_at="2026-08-18T10:00:00+03:00",
        )


def _network_edit_setup(monkeypatch):
    o1 = _occ(id="o1", branch_id="b1", assignee_user_id="e1")
    o2 = _occ(id="o2", branch_id="b2", assignee_user_id="e2")
    branches = [
        Branch(id="b1", network_id="n1", name="א"),
        Branch(id="b2", network_id="n1", name="ב"),
    ]
    emps = {
        "b1": [_emp("e1", created_at="2026-01-01T00:00:00", branch_id="b1")],
        "b2": [_emp("e2", created_at="2026-01-01T00:00:00", branch_id="b2")],
    }
    svc, occ = _svc(branches, emps)
    occ.find_by_id.return_value = o1
    occ.list_by_network_group.return_value = [o1, o2]

    def do_update(id_, **kw):
        src = o1 if id_ == "o1" else o2
        return _occ(
            id=src.id,
            branch_id=src.branch_id,
            title=kw["title"],
            assignee_user_id=kw["assignee_user_id"],
        )

    occ.update_details.side_effect = do_update
    occ.delete.return_value = True
    monkeypatch.setattr(
        "app.services.task_occurrence_service.UserBranchMembershipRepository",
        lambda db: MagicMock(list_branch_ids_for_user=lambda uid: []),
    )
    return svc, occ, o1, o2


def _edit_kwargs(**over) -> dict:
    base = dict(
        title="כותרת חדשה",
        description="ד",
        due_at="2026-08-18T11:00:00+03:00",
        assignee_user_id="e1",
        apply_to_network=True,
    )
    base.update(over)
    return base


def test_update_ad_hoc_network_keeps_sibling_assignee(monkeypatch):
    svc, occ, _, _ = _network_edit_setup(monkeypatch)
    result = svc.update_occurrence(_actor(), "o1", **_edit_kwargs())
    assert result["updated_count"] == 2
    by_id = {c.args[0]: c.kwargs for c in occ.update_details.call_args_list}
    assert by_id["o1"]["assignee_user_id"] == "e1"
    assert by_id["o2"]["assignee_user_id"] == "e2"
    assert by_id["o1"]["title"] == "כותרת חדשה"
    assert by_id["o2"]["title"] == "כותרת חדשה"


def test_update_ad_hoc_local_only(monkeypatch):
    svc, occ, _, _ = _network_edit_setup(monkeypatch)
    result = svc.update_occurrence(_actor(), "o1", **_edit_kwargs(apply_to_network=False))
    assert "updated_count" not in result
    occ.update_details.assert_called_once()
    occ.list_by_network_group.assert_not_called()


def test_update_ad_hoc_network_forbidden_for_branch_manager(monkeypatch):
    svc, occ, _, _ = _network_edit_setup(monkeypatch)
    actor = ActorContext(
        user_id="bm", role=roles.BRANCH_MANAGER, network_id="n1", branch_id="b1"
    )
    with pytest.raises(PermissionError):
        svc.update_occurrence(actor, "o1", **_edit_kwargs())


def test_cancel_ad_hoc_network_group(monkeypatch):
    svc, occ, o1, o2 = _network_edit_setup(monkeypatch)
    occ.find_by_id.return_value = o1
    result = svc.cancel_occurrence(_actor(), "o1", apply_to_network=True)
    assert result["deleted_count"] == 2
    assert {c.args[0] for c in occ.delete.call_args_list} == {"o1", "o2"}


def test_cancel_ad_hoc_local_only(monkeypatch):
    svc, occ, _, _ = _network_edit_setup(monkeypatch)
    result = svc.cancel_occurrence(_actor(), "o1", apply_to_network=False)
    assert result["deleted_count"] == 1
    occ.delete.assert_called_once_with("o1")


def test_cancel_ad_hoc_network_forbidden_for_branch_manager(monkeypatch):
    svc, _, _, _ = _network_edit_setup(monkeypatch)
    actor = ActorContext(
        user_id="bm", role=roles.BRANCH_MANAGER, network_id="n1", branch_id="b1"
    )
    with pytest.raises(PermissionError):
        svc.cancel_occurrence(actor, "o1", apply_to_network=True)
