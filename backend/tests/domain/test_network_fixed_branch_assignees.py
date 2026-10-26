"""Tests — oved choisi par snif à la création d'une tâche קבועה réseau."""
from unittest.mock import MagicMock

import pytest

from app.domain import roles
from app.domain.network_fixed_task import resolve_branch_assignee_id
from app.domain.scope import ActorContext
from app.models.branch import Branch
from app.models.user import User
from app.services.task_template_service import TaskTemplateService


def _emp(uid: str, branch_id: str, created_at: str = "2026-01-01T00:00:00") -> User:
    return User(
        id=uid,
        email=f"{uid}@t.com",
        first_name=uid,
        last_name="ע",
        role=roles.EMPLOYEE,
        branch_id=branch_id,
        is_active=True,
        created_at=created_at,
    )


def _created_template(**kw):
    return MagicMock(
        id=f"tpl-{kw['branch_id']}",
        branch_id=kw["branch_id"],
        title=kw["title"],
        description="",
        recurrence=kw["recurrence"],
        due_time="09:00",
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


def _service(monkeypatch, employees_by_branch):
    branches = [Branch(id=b, network_id="n1", name=b) for b in employees_by_branch]
    templates = MagicMock()
    templates.create.side_effect = _created_template
    branch_repo = MagicMock()
    branch_repo.list_branches.return_value = branches
    branch_repo.find_by_id.side_effect = lambda i: next((b for b in branches if b.id == i), None)
    users = MagicMock()
    users.list_users.side_effect = lambda *, branch_ids=None, **_: employees_by_branch[branch_ids[0]]
    everyone = [u for emps in employees_by_branch.values() for u in emps]
    users.find_by_id.side_effect = lambda i: next((u for u in everyone if u.id == i), None)
    scheduler = MagicMock()
    scheduler.generate_from_template.return_value = None
    monkeypatch.setattr(
        "app.services.task_template_service.UserBranchMembershipRepository",
        lambda db: MagicMock(list_branch_ids_for_user=lambda uid: []),
    )
    return TaskTemplateService(templates, branch_repo, MagicMock(), users, scheduler), templates


_ACTOR = ActorContext(user_id="m1", role=roles.NETWORK_MANAGER, network_id="n1", branch_id=None)


def test_resolve_prefers_explicit_choice_then_first_employee():
    old = _emp("old", "b1", "2025-01-01T00:00:00")
    new = _emp("new", "b1", "2026-01-01T00:00:00")
    assert resolve_branch_assignee_id("b1", {"b1": "new"}, [old, new]) == "new"
    assert resolve_branch_assignee_id("b1", {"b2": "x"}, [new, old]) == "old"
    assert resolve_branch_assignee_id("b1", None, [new, old]) == "old"


def test_resolve_returns_none_without_candidate():
    assert resolve_branch_assignee_id("b1", {}, []) is None


def test_network_create_uses_the_chosen_employee_per_branch(monkeypatch):
    emps = {
        "b1": [_emp("e1a", "b1", "2025-01-01T00:00:00"), _emp("e1b", "b1")],
        "b2": [_emp("e2", "b2")],
    }
    svc, templates = _service(monkeypatch, emps)
    svc.create_templates_for_network(
        _ACTOR, title="X", recurrence="daily", branch_assignees={"b1": "e1b"}
    )
    picked = {c.kwargs["branch_id"]: c.kwargs["assignee_user_id"] for c in templates.create.call_args_list}
    assert picked == {"b1": "e1b", "b2": "e2"}


def test_network_create_rejects_an_employee_of_another_branch(monkeypatch):
    emps = {"b1": [_emp("e1", "b1")], "b2": [_emp("e2", "b2")]}
    svc, templates = _service(monkeypatch, emps)
    with pytest.raises((ValueError, PermissionError)):
        svc.create_templates_for_network(
            _ACTOR, title="X", recurrence="daily", branch_assignees={"b1": "e2"}
        )
    templates.create.assert_not_called()
