"""Intégration : tâches קבועות groupées, réglages généraux et adaptations par snif."""
from __future__ import annotations

import pytest

import app.db.session as db_session
from app.domain import roles
from app.repositories.user_repository import UserRepository
from tests.integration.conftest import PASSWORD, MGR_EMAIL, login_client

NM_EMAIL = "nm.fixedgroups@test.local"


@pytest.fixture()
def client_nm(app, second_branch_seed):
    db = db_session.SessionLocal()
    try:
        UserRepository(db).create_user(
            email=NM_EMAIL,
            password=PASSWORD,
            first_name="Reshet",
            last_name="Mgr",
            role=roles.NETWORK_MANAGER,
            email_verified=True,
            network_id=second_branch_seed["network_id"],
        )
        db.commit()
    finally:
        db.close()
    return login_client(app, NM_EMAIL)


@pytest.fixture()
def group(client_nm):
    created = client_nm.post(
        "/api/tasks/templates",
        json={
            "title": "בדיקה יומית",
            "description": "",
            "recurrence": "daily",
            "due_time": "09:00",
            "apply_to_network": True,
        },
    )
    assert created.status_code == 201, created.text
    key = created.json()["templates"][0]["network_group_id"]
    return client_nm.get(f"/api/fixed-tasks/{key}").json()


def _branch(group: dict, branch_id: str) -> dict:
    return next(b for b in group["branches"] if b["branch_id"] == branch_id)


def _general(group: dict, **over) -> dict:
    body = {
        "title": group["title"],
        "description": group["description"],
        "due_time": group["due_time"],
        "weekly_days": group["weekly_days"],
        "is_active": True,
    }
    body.update(over)
    return body


def test_list_returns_one_card_per_task_not_per_branch(client_nm, group):
    rows = client_nm.get("/api/fixed-tasks").json()
    assert len(rows) == 1
    assert rows[0]["branch_count"] == 2
    assert rows[0]["is_network"] is True
    assert rows[0]["overridden_count"] == 0


def test_branch_override_marks_field_and_exposes_default(client_nm, group, second_branch_seed):
    world = second_branch_seed
    tpl = _branch(group, world["branch_b_id"])["template_id"]
    res = client_nm.patch(
        f"/api/fixed-tasks/branches/{tpl}", json={"changes": {"due_time": "07:30"}}
    )
    assert res.status_code == 200, res.text
    assert res.json()["overridden_fields"] == ["due_time"]
    fresh = client_nm.get(f"/api/fixed-tasks/{group['key']}").json()
    assert fresh["due_time"] == "09:00"
    assert fresh["overridden_count"] == 1


def test_general_update_keeps_overridden_value(client_nm, group, second_branch_seed):
    world = second_branch_seed
    tpl_b = _branch(group, world["branch_b_id"])["template_id"]
    client_nm.patch(f"/api/fixed-tasks/branches/{tpl_b}", json={"changes": {"due_time": "07:30"}})
    res = client_nm.patch(
        f"/api/fixed-tasks/{group['key']}/defaults",
        json=_general(group, title="כותרת חדשה", due_time="11:00"),
    )
    assert res.status_code == 200, res.text
    fresh = res.json()
    assert fresh["title"] == "כותרת חדשה"
    assert _branch(fresh, world["branch_id"])["due_time"] == "11:00"
    assert _branch(fresh, world["branch_b_id"])["due_time"] == "07:30"


def test_reset_restores_default_and_clears_marker(client_nm, group, second_branch_seed):
    world = second_branch_seed
    tpl_b = _branch(group, world["branch_b_id"])["template_id"]
    client_nm.patch(f"/api/fixed-tasks/branches/{tpl_b}", json={"changes": {"due_time": "07:30"}})
    res = client_nm.patch(f"/api/fixed-tasks/branches/{tpl_b}", json={"reset": ["due_time"]})
    assert res.status_code == 200, res.text
    assert res.json()["due_time"] == "09:00"
    assert res.json()["overridden_fields"] == []


def test_setting_default_value_is_not_an_override(client_nm, group, second_branch_seed):
    tpl_b = _branch(group, second_branch_seed["branch_b_id"])["template_id"]
    res = client_nm.patch(
        f"/api/fixed-tasks/branches/{tpl_b}", json={"changes": {"due_time": "09:00"}}
    )
    assert res.status_code == 200, res.text
    assert res.json()["overridden_fields"] == []


def test_branch_override_rejects_invalid_time_and_foreign_field(client_nm, group, second_branch_seed):
    tpl_b = _branch(group, second_branch_seed["branch_b_id"])["template_id"]
    bad_time = client_nm.patch(
        f"/api/fixed-tasks/branches/{tpl_b}", json={"changes": {"due_time": "25:99"}}
    )
    bad_field = client_nm.patch(
        f"/api/fixed-tasks/branches/{tpl_b}", json={"changes": {"title": "X"}}
    )
    assert bad_time.status_code == 400
    assert bad_field.status_code == 400


def test_branch_override_toggles_activity_without_touching_siblings(
    client_nm, group, second_branch_seed
):
    world = second_branch_seed
    tpl_b = _branch(group, world["branch_b_id"])["template_id"]
    client_nm.patch(f"/api/fixed-tasks/branches/{tpl_b}", json={"changes": {"is_active": False}})
    fresh = client_nm.get(f"/api/fixed-tasks/{group['key']}").json()
    assert fresh["active_count"] == 1
    assert _branch(fresh, world["branch_id"])["is_active"] is True


def test_assignee_change_is_local_and_not_an_override(client_nm, group, second_branch_seed):
    world = second_branch_seed
    tpl_b = _branch(group, world["branch_b_id"])["template_id"]
    res = client_nm.patch(
        f"/api/fixed-tasks/branches/{tpl_b}",
        json={"changes": {"assignee_user_id": world["employee_b_id"]}},
    )
    assert res.status_code == 200, res.text
    assert res.json()["overridden_fields"] == []


def test_assignee_from_other_branch_is_rejected(client_nm, group, second_branch_seed):
    world = second_branch_seed
    tpl_b = _branch(group, world["branch_b_id"])["template_id"]
    res = client_nm.patch(
        f"/api/fixed-tasks/branches/{tpl_b}",
        json={"changes": {"assignee_user_id": world["employee_id"]}},
    )
    assert res.status_code == 400


def test_branch_manager_adapts_own_branch_but_not_defaults(app, group, second_branch_seed):
    world = second_branch_seed
    client_mgr = login_client(app, MGR_EMAIL)
    listed = client_mgr.get("/api/fixed-tasks").json()
    assert len(listed) == 1 and listed[0]["branch_count"] == 1
    assert listed[0]["can_edit_defaults"] is False
    own = _branch(group, world["branch_id"])["template_id"]
    ok = client_mgr.patch(f"/api/fixed-tasks/branches/{own}", json={"changes": {"due_time": "08:00"}})
    assert ok.status_code == 200, ok.text
    other = _branch(group, world["branch_b_id"])["template_id"]
    denied = client_mgr.patch(f"/api/fixed-tasks/branches/{other}", json={"changes": {"due_time": "08:00"}})
    assert denied.status_code == 403
    general = client_mgr.patch(f"/api/fixed-tasks/{group['key']}/defaults", json=_general(group))
    assert general.status_code == 403


def test_single_branch_task_is_its_own_group(client_nm, second_branch_seed):
    world = second_branch_seed
    created = client_nm.post(
        "/api/tasks/templates",
        json={
            "title": "רק אחד",
            "recurrence": "daily",
            "due_time": "10:00",
            "branch_id": world["branch_id"],
            "assignee_user_id": world["employee_id"],
        },
    )
    assert created.status_code == 201, created.text
    key = created.json()["template"]["id"]
    detail = client_nm.get(f"/api/fixed-tasks/{key}").json()
    assert detail["is_network"] is False and detail["can_edit_defaults"] is True
    res = client_nm.patch(
        f"/api/fixed-tasks/{key}/defaults", json=_general(detail, title="שונה", due_time="12:00")
    )
    assert res.status_code == 200, res.text
    assert res.json()["title"] == "שונה" and res.json()["due_time"] == "12:00"


def test_unknown_task_returns_400(client_nm, second_branch_seed):
    res = client_nm.get("/api/fixed-tasks/00000000-0000-0000-0000-000000000000")
    assert res.status_code == 400
