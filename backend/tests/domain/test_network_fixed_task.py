"""Tests — premier oved + déploiement réseau."""
from unittest.mock import MagicMock

import pytest

from app.domain import roles
from app.domain.network_fixed_task import (
    can_edit_network_fixed_group,
    grouped_network_ids,
    pick_first_employee,
    select_network_create_branches,
)
from app.domain.scope import ActorContext
from app.models.branch import Branch
from app.models.task_template import TaskTemplate
from app.models.user import User
from app.services.task_template_service import TaskTemplateService


def _emp(uid: str, *, created_at: str, active: bool = True) -> User:
    return User(
        id=uid,
        email=f"{uid}@t.com",
        first_name=uid,
        last_name="ע",
        role=roles.EMPLOYEE,
        branch_id="b1",
        is_active=active,
        created_at=created_at,
    )


def test_pick_first_employee_oldest_active():
    older = _emp("a", created_at="2026-01-01T00:00:00")
    newer = _emp("b", created_at="2026-06-01T00:00:00")
    inactive = _emp("c", created_at="2025-01-01T00:00:00", active=False)
    assert pick_first_employee([newer, inactive, older]) is older


def test_pick_first_employee_empty():
    assert pick_first_employee([]) is None
    assert pick_first_employee([_emp("x", created_at="2026-01-01", active=False)]) is None


def _template_service(branches, employees_by_branch):
    templates = MagicMock()
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
    scheduler = MagicMock()
    scheduler.generate_from_template.return_value = None
    svc = TaskTemplateService(
        templates, branch_repo, MagicMock(), users, scheduler
    )
    return svc, templates


def test_create_templates_for_network_duplicates_per_branch(monkeypatch):
    branches = [
        Branch(id="b1", network_id="n1", name="א"),
        Branch(id="b2", network_id="n1", name="ב"),
    ]
    emps = {
        "b1": [_emp("e1", created_at="2026-01-01T00:00:00")],
        "b2": [
            _emp("e2b", created_at="2026-03-01T00:00:00"),
            _emp("e2a", created_at="2026-01-15T00:00:00"),
        ],
    }
    for e in emps["b1"]:
        e.branch_id = "b1"
    for e in emps["b2"]:
        e.branch_id = "b2"
    svc, templates = _template_service(branches, emps)
    templates.create.side_effect = lambda **kw: MagicMock(
        id=f"tpl-{kw['branch_id']}",
        branch_id=kw["branch_id"],
        title=kw["title"],
        description=kw.get("description") or "",
        recurrence=kw["recurrence"],
        due_time=kw.get("due_time") or "09:00",
        weekly_days=kw.get("weekly_days"),
        monthly_day=kw.get("monthly_day"),
        assignee_user_id=kw["assignee_user_id"],
        department_id=None,
        is_active=True,
        task_kind="fixed",
        reference_photo_url=None,
        reference_video_url=None,
        reference_audio_url=None,
        source_gallery_item_id=None,
        ops_category=kw.get("ops_category"),
        created_by_id="m1",
        created_at="2026-08-18",
        updated_at="2026-08-18",
        biweekly_anchor=None,
    )
    monkeypatch.setattr(
        "app.services.task_template_service.UserBranchMembershipRepository",
        lambda db: MagicMock(list_branch_ids_for_user=lambda uid: []),
    )
    actor = ActorContext(
        user_id="m1", role=roles.NETWORK_MANAGER, network_id="n1", branch_id=None
    )
    result = svc.create_templates_for_network(
        actor,
        title="בדיקה יומית",
        recurrence="daily",
        due_time="09:00",
        ops_category="info_collection",
    )
    assert len(result["templates"]) == 2
    assignees = {c.kwargs["assignee_user_id"] for c in templates.create.call_args_list}
    assert assignees == {"e1", "e2a"}
    assert all(c.kwargs["ops_category"] == "info_collection" for c in templates.create.call_args_list)
    group_ids = {c.kwargs["network_group_id"] for c in templates.create.call_args_list}
    assert len(group_ids) == 1
    assert None not in group_ids


def test_select_network_create_branches_subset_and_all():
    branches = [
        Branch(id="b1", network_id="n1", name="א"),
        Branch(id="b2", network_id="n1", name="ב"),
        Branch(id="b3", network_id="n1", name="ג"),
    ]
    picked = select_network_create_branches(branches, ["b3", "b1"])
    assert [b.id for b in picked] == ["b3", "b1"]
    assert select_network_create_branches(branches, None) == branches
    assert select_network_create_branches(branches, []) == branches
    with pytest.raises(PermissionError):
        select_network_create_branches(branches, ["b9"])


def test_create_templates_for_network_subset_of_branches(monkeypatch):
    branches = [
        Branch(id="b1", network_id="n1", name="א"),
        Branch(id="b2", network_id="n1", name="ב"),
        Branch(id="b3", network_id="n1", name="ג"),
    ]
    emps = {
        "b1": [_emp("e1", created_at="2026-01-01T00:00:00")],
        "b2": [_emp("e2", created_at="2026-01-01T00:00:00")],
        "b3": [_emp("e3", created_at="2026-01-01T00:00:00")],
    }
    for bid, users in emps.items():
        for u in users:
            u.branch_id = bid
    svc, templates = _template_service(branches, emps)
    templates.create.side_effect = lambda **kw: MagicMock(
        id=f"tpl-{kw['branch_id']}",
        branch_id=kw["branch_id"],
        title=kw["title"],
        description="",
        recurrence=kw["recurrence"],
        due_time=kw.get("due_time") or "09:00",
        weekly_days=None,
        monthly_day=None,
        assignee_user_id=kw["assignee_user_id"],
        department_id=None,
        is_active=True,
        task_kind="fixed",
        reference_photo_url=None,
        reference_video_url=None,
        reference_audio_url=None,
        source_gallery_item_id=None,
        ops_category=None,
        created_by_id="m1",
        created_at="2026-08-18",
        updated_at="2026-08-18",
        biweekly_anchor=None,
    )
    monkeypatch.setattr(
        "app.services.task_template_service.UserBranchMembershipRepository",
        lambda db: MagicMock(list_branch_ids_for_user=lambda uid: []),
    )
    actor = ActorContext(
        user_id="m1", role=roles.NETWORK_MANAGER, network_id="n1", branch_id=None
    )
    result = svc.create_templates_for_network(
        actor, title="X", recurrence="daily", branch_ids=["b3", "b1"]
    )
    assert len(result["templates"]) == 2
    created_branches = [c.kwargs["branch_id"] for c in templates.create.call_args_list]
    assert created_branches == ["b3", "b1"]
    assignees = {c.kwargs["assignee_user_id"] for c in templates.create.call_args_list}
    assert assignees == {"e3", "e1"}


def test_create_template_one_branch_has_no_network_group(monkeypatch):
    branches = [Branch(id="b1", network_id="n1", name="א")]
    emps = {"b1": [_emp("e1", created_at="2026-01-01T00:00:00")]}
    emps["b1"][0].branch_id = "b1"
    svc, templates = _template_service(branches, emps)
    templates.create.side_effect = lambda **kw: _domain_tpl(
        id="t-local",
        branch_id=kw["branch_id"],
        assignee_user_id=kw["assignee_user_id"],
        title=kw["title"],
        network_group_id=kw.get("network_group_id"),
    )
    monkeypatch.setattr(
        "app.services.task_template_service.UserBranchMembershipRepository",
        lambda db: MagicMock(list_branch_ids_for_user=lambda uid: []),
    )
    actor = ActorContext(
        user_id="m1", role=roles.NETWORK_MANAGER, network_id="n1", branch_id=None
    )
    svc.create_template(
        actor,
        branch_id="b1",
        title="מקומית",
        recurrence="daily",
        due_time="09:00",
        assignee_user_id="e1",
    )
    templates.create.assert_called_once()
    assert templates.create.call_args.kwargs["network_group_id"] is None
    assert templates.create.call_args.kwargs["branch_id"] == "b1"


def test_create_templates_for_network_skips_empty_snif(monkeypatch):
    branches = [
        Branch(id="b1", network_id="n1", name="א"),
        Branch(id="b2", network_id="n1", name="ב"),
    ]
    emps = {"b1": [_emp("e1", created_at="2026-01-01T00:00:00")], "b2": []}
    emps["b1"][0].branch_id = "b1"
    svc, templates = _template_service(branches, emps)
    templates.create.side_effect = lambda **kw: _domain_tpl(
        id=f"tpl-{kw['branch_id']}",
        branch_id=kw["branch_id"],
        assignee_user_id=kw["assignee_user_id"],
        title=kw["title"],
        network_group_id=kw.get("network_group_id"),
    )
    monkeypatch.setattr(
        "app.services.task_template_service.UserBranchMembershipRepository",
        lambda db: MagicMock(list_branch_ids_for_user=lambda uid: []),
    )
    actor = ActorContext(
        user_id="m1", role=roles.NETWORK_MANAGER, network_id="n1", branch_id=None
    )
    result = svc.create_templates_for_network(actor, title="X", recurrence="daily")
    assert len(result["templates"]) == 1
    assert result["skipped"][0]["branch_id"] == "b2"
    templates.create.assert_called_once()


def test_create_templates_for_network_forbidden_for_branch_manager():
    svc, _ = _template_service([], {})
    actor = ActorContext(
        user_id="bm", role=roles.BRANCH_MANAGER, network_id="n1", branch_id="b1"
    )
    with pytest.raises(PermissionError):
        svc.create_templates_for_network(actor, title="X", recurrence="daily")


def test_can_edit_network_fixed_group_roles():
    assert can_edit_network_fixed_group(roles.NETWORK_MANAGER) is True
    assert can_edit_network_fixed_group(roles.ADMIN) is True
    assert can_edit_network_fixed_group(roles.BRANCH_MANAGER) is False


def test_grouped_network_ids_same_content_two_branches():
    t1 = _domain_tpl(id="t1", branch_id="b1", network_group_id=None)
    t2 = _domain_tpl(id="t2", branch_id="b2", network_group_id=None)
    t3 = _domain_tpl(id="t3", branch_id="b1", title="אחר", network_group_id=None)
    assert grouped_network_ids([t1, t2, t3]) == {"t1", "t2"}


def test_grouped_network_ids_from_group_id():
    t1 = _domain_tpl(id="t1", branch_id="b1", network_group_id="g1")
    assert grouped_network_ids([t1]) == {"t1"}


def _domain_tpl(**kw) -> TaskTemplate:
    base = dict(
        id="t1",
        branch_id="b1",
        title="כותרת",
        description="",
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
        ops_category="cleaning",
        network_group_id="g1",
    )
    base.update(kw)
    return TaskTemplate(**base)


def _edit_kwargs(**over) -> dict:
    base = dict(
        title="כותרת חדשה",
        description="ד",
        due_time="10:00",
        weekly_days=None,
        assignee_user_id="e1",
        department_id=None,
        is_active=True,
        update_ops_category=True,
        ops_category="orders",
        apply_to_network=True,
    )
    base.update(over)
    return base


def _network_update_setup(monkeypatch):
    t1 = _domain_tpl(id="t1", branch_id="b1", assignee_user_id="e1")
    t2 = _domain_tpl(id="t2", branch_id="b2", assignee_user_id="e2a")
    branches = [
        Branch(id="b1", network_id="n1", name="א"),
        Branch(id="b2", network_id="n1", name="ב"),
    ]
    emps = {
        "b1": [_emp("e1", created_at="2026-01-01T00:00:00")],
        "b2": [_emp("e2a", created_at="2026-01-15T00:00:00")],
    }
    for e in emps["b1"]:
        e.branch_id = "b1"
    for e in emps["b2"]:
        e.branch_id = "b2"
    svc, templates = _template_service(branches, emps)
    templates.find_by_id.return_value = t1
    templates.list_by_network_group.return_value = [t1, t2]

    def do_update(id_, **kw):
        src = t1 if id_ == "t1" else t2
        return _domain_tpl(
            id=src.id,
            branch_id=src.branch_id,
            title=kw["title"],
            assignee_user_id=kw["assignee_user_id"],
            ops_category=kw.get("ops_category"),
        )

    templates.update.side_effect = do_update
    monkeypatch.setattr(
        "app.services.task_template_service.UserBranchMembershipRepository",
        lambda db: MagicMock(list_branch_ids_for_user=lambda uid: []),
    )
    actor = ActorContext(
        user_id="m1", role=roles.NETWORK_MANAGER, network_id="n1", branch_id=None
    )
    return svc, templates, actor


def test_update_network_keeps_per_branch_assignee(monkeypatch):
    svc, templates, actor = _network_update_setup(monkeypatch)
    result = svc.update_template(actor, "t1", **_edit_kwargs())
    assert result["updated_count"] == 2
    by_id = {c.args[0]: c.kwargs for c in templates.update.call_args_list}
    assert by_id["t1"]["assignee_user_id"] == "e1"
    assert by_id["t2"]["assignee_user_id"] == "e2a"
    assert by_id["t1"]["title"] == "כותרת חדשה"
    assert by_id["t2"]["title"] == "כותרת חדשה"
    assert by_id["t2"]["ops_category"] == "orders"


def test_update_without_network_flag_only_one(monkeypatch):
    svc, templates, actor = _network_update_setup(monkeypatch)
    result = svc.update_template(actor, "t1", **_edit_kwargs(apply_to_network=False))
    assert "updated_count" not in result
    assert templates.update.call_count == 1
    templates.list_by_network_group.assert_not_called()


def test_update_network_forbidden_for_branch_manager(monkeypatch):
    t1 = _domain_tpl()
    svc, templates = _template_service(
        [Branch(id="b1", network_id="n1", name="א")],
        {"b1": [_emp("e1", created_at="2026-01-01T00:00:00")]},
    )
    templates.find_by_id.return_value = t1
    actor = ActorContext(
        user_id="bm", role=roles.BRANCH_MANAGER, network_id="n1", branch_id="b1"
    )
    with pytest.raises(PermissionError):
        svc.update_template(actor, "t1", **_edit_kwargs())


def test_delete_template_network_group(monkeypatch):
    svc, templates, actor = _network_update_setup(monkeypatch)
    templates.delete.return_value = True
    result = svc.delete_template(actor, "t1", apply_to_network=True)
    assert result["deleted_count"] == 2
    assert {c.args[0] for c in templates.delete.call_args_list} == {"t1", "t2"}


def test_delete_template_local_only(monkeypatch):
    svc, templates, actor = _network_update_setup(monkeypatch)
    templates.delete.return_value = True
    result = svc.delete_template(actor, "t1", apply_to_network=False)
    assert result["deleted_count"] == 1
    templates.delete.assert_called_once_with("t1")


def test_delete_template_network_forbidden_for_branch_manager(monkeypatch):
    t1 = _domain_tpl()
    svc, templates = _template_service(
        [Branch(id="b1", network_id="n1", name="א")],
        {"b1": [_emp("e1", created_at="2026-01-01T00:00:00")]},
    )
    templates.find_by_id.return_value = t1
    actor = ActorContext(
        user_id="bm", role=roles.BRANCH_MANAGER, network_id="n1", branch_id="b1"
    )
    with pytest.raises(PermissionError):
        svc.delete_template(actor, "t1", apply_to_network=True)


def test_delete_template_purges_open_occurrences(monkeypatch):
    svc, templates, actor = _network_update_setup(monkeypatch)
    templates.delete.return_value = True
    open_occ = MagicMock(
        id="o1", status="pending", branch_id="b1", assignee_user_id="e1", title="כותרת"
    )
    done_occ = MagicMock(
        id="o2", status="completed", branch_id="b1", assignee_user_id="e1", title="כותרת"
    )
    occ_repo = MagicMock()
    occ_repo.list_by_template_id.return_value = [open_occ, done_occ]
    completions = MagicMock()
    notifs = MagicMock()
    svc._occurrences = occ_repo
    svc._completions = completions
    svc._notifications = notifs
    result = svc.delete_template(actor, "t1", apply_to_network=False)
    occ_repo.delete.assert_called_once_with("o1")
    completions.delete_by_occurrence.assert_called_once_with("o1")
    notifs.clear_occurrence_links.assert_called_once_with("o1")
    occ_repo.clear_template_id.assert_called_once_with("t1")
    assert result["cancelled_occurrences"][0]["id"] == "o1"
