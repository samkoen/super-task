"""Intégration : מזדמנות / קבועות sur un snif, une liste, ou toute la רשת."""
from __future__ import annotations

import pytest

import app.db.session as db_session
from app.domain import roles
from app.repositories.user_repository import UserRepository
from tests.integration.conftest import PASSWORD, due_at_iso, login_client

NM_EMAIL = "nm.scopes@test.local"


@pytest.fixture()
def client_nm(app, second_branch_seed):
    assert db_session.SessionLocal is not None
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


def _ad_hoc_payload(world, **over) -> dict:
    body = {
        "title": "ביקור רשת",
        "description": "",
        "due_at": due_at_iso(),
        "photo_required": False,
        "apply_to_network": True,
    }
    body.update(over)
    return body


def _fixed_payload(**over) -> dict:
    body = {
        "title": "בדיקה יומית",
        "description": "",
        "recurrence": "daily",
        "due_time": "09:00",
        "apply_to_network": True,
    }
    body.update(over)
    return body


def _by_branch(rows: list[dict]) -> dict[str, dict]:
    return {row["branch_id"]: row for row in rows}


def test_ad_hoc_create_all_network_persists_group(client_nm, second_branch_seed):
    world = second_branch_seed
    created = client_nm.post("/api/tasks/ad-hoc", json=_ad_hoc_payload(world))
    assert created.status_code == 201, created.text
    rows = created.json()["occurrences"]
    assert len(rows) == 2
    assert {r["branch_id"] for r in rows} == {world["branch_id"], world["branch_b_id"]}
    assert {r["assignee_user_id"] for r in rows} == {
        world["employee_id"],
        world["employee_b_id"],
    }
    groups = {r["network_group_id"] for r in rows}
    assert len(groups) == 1
    assert None not in groups
    assert all(r["is_network_task"] for r in rows)


def test_ad_hoc_create_selected_branches_only(client_nm, second_branch_seed):
    world = second_branch_seed
    created = client_nm.post(
        "/api/tasks/ad-hoc",
        json=_ad_hoc_payload(world, branch_ids=[world["branch_b_id"]]),
    )
    assert created.status_code == 201, created.text
    rows = created.json()["occurrences"]
    assert len(rows) == 1
    assert rows[0]["branch_id"] == world["branch_b_id"]
    assert rows[0]["assignee_user_id"] == world["employee_b_id"]


def test_ad_hoc_update_network_then_local(client_nm, second_branch_seed):
    world = second_branch_seed
    rows = client_nm.post("/api/tasks/ad-hoc", json=_ad_hoc_payload(world)).json()[
        "occurrences"
    ]
    by_branch = _by_branch(rows)
    primary = by_branch[world["branch_id"]]
    sibling = by_branch[world["branch_b_id"]]
    due = primary["due_at"]

    networked = client_nm.post(
        f"/api/tasks/occurrences/{primary['id']}/update",
        json={
            "title": "עודכן ברשת",
            "description": "ד",
            "due_at": due,
            "assignee_user_id": primary["assignee_user_id"],
            "apply_to_network": True,
        },
    )
    assert networked.status_code == 200, networked.text
    assert networked.json()["updated_count"] == 2
    listed = _by_branch(client_nm.get("/api/tasks/occurrences").json())
    assert listed[world["branch_id"]]["title"] == "עודכן ברשת"
    assert listed[world["branch_b_id"]]["title"] == "עודכן ברשת"
    assert listed[world["branch_b_id"]]["assignee_user_id"] == sibling["assignee_user_id"]

    local = client_nm.post(
        f"/api/tasks/occurrences/{primary['id']}/update",
        json={
            "title": "רק הסניף",
            "description": "ד",
            "due_at": due,
            "assignee_user_id": primary["assignee_user_id"],
            "apply_to_network": False,
        },
    )
    assert local.status_code == 200, local.text
    assert local.json()["updated_count"] == 1
    listed = _by_branch(client_nm.get("/api/tasks/occurrences").json())
    assert listed[world["branch_id"]]["title"] == "רק הסניף"
    assert listed[world["branch_b_id"]]["title"] == "עודכן ברשת"


def test_ad_hoc_cancel_local_then_network(client_nm, second_branch_seed):
    world = second_branch_seed
    first = client_nm.post("/api/tasks/ad-hoc", json=_ad_hoc_payload(world, title="A"))
    second = client_nm.post("/api/tasks/ad-hoc", json=_ad_hoc_payload(world, title="B"))
    assert first.status_code == 201 and second.status_code == 201
    group_a = _by_branch(first.json()["occurrences"])
    group_b = _by_branch(second.json()["occurrences"])

    local = client_nm.post(
        f"/api/tasks/occurrences/{group_a[world['branch_id']]['id']}/cancel"
    )
    assert local.status_code == 200, local.text
    assert local.json()["deleted_count"] == 1
    leftover = client_nm.get("/api/tasks/occurrences").json()
    leftover_ids = {row["id"] for row in leftover}
    assert group_a[world["branch_id"]]["id"] not in leftover_ids
    assert group_a[world["branch_b_id"]]["id"] in leftover_ids

    networked = client_nm.post(
        f"/api/tasks/occurrences/{group_b[world['branch_id']]['id']}/cancel",
        params={"apply_to_network": True},
    )
    assert networked.status_code == 200, networked.text
    assert networked.json()["deleted_count"] == 2
    remaining_ids = {row["id"] for row in client_nm.get("/api/tasks/occurrences").json()}
    assert group_b[world["branch_id"]]["id"] not in remaining_ids
    assert group_b[world["branch_b_id"]]["id"] not in remaining_ids


def test_fixed_create_all_then_delete_network_or_local(client_nm, second_branch_seed):
    world = second_branch_seed
    created = client_nm.post("/api/tasks/templates", json=_fixed_payload())
    assert created.status_code == 201, created.text
    templates = created.json()["templates"]
    assert len(templates) == 2
    groups = {t["network_group_id"] for t in templates}
    assert len(groups) == 1 and None not in groups
    by_branch = _by_branch(templates)

    local = client_nm.delete(f"/api/tasks/templates/{by_branch[world['branch_id']]['id']}")
    assert local.status_code == 200, local.text
    assert local.json()["deleted_count"] == 1
    leftover = client_nm.get("/api/tasks/templates").json()
    assert {t["branch_id"] for t in leftover} == {world["branch_b_id"]}

    again = client_nm.post("/api/tasks/templates", json=_fixed_payload(title="שניה"))
    assert again.status_code == 201, again.text
    group = again.json()["templates"]
    networked = client_nm.delete(
        f"/api/tasks/templates/{group[0]['id']}",
        params={"apply_to_network": True},
    )
    assert networked.status_code == 200, networked.text
    assert networked.json()["deleted_count"] == 2


def test_fixed_update_network_keeps_assignees(client_nm, second_branch_seed):
    world = second_branch_seed
    created = client_nm.post("/api/tasks/templates", json=_fixed_payload())
    assert created.status_code == 201, created.text
    by_branch = _by_branch(created.json()["templates"])
    primary = by_branch[world["branch_id"]]
    sibling = by_branch[world["branch_b_id"]]
    updated = client_nm.patch(
        f"/api/tasks/templates/{primary['id']}",
        json={
            "title": "כותרת רשת",
            "description": "ד",
            "due_time": "11:00",
            "assignee_user_id": primary["assignee_user_id"],
            "is_active": True,
            "apply_to_network": True,
        },
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["updated_count"] == 2
    listed = _by_branch(client_nm.get("/api/tasks/templates").json())
    assert listed[world["branch_id"]]["title"] == "כותרת רשת"
    assert listed[world["branch_b_id"]]["title"] == "כותרת רשת"
    assert listed[world["branch_b_id"]]["assignee_user_id"] == sibling["assignee_user_id"]
    assert listed[world["branch_id"]]["due_time"] == "11:00"


def test_branch_manager_cannot_fan_out(client_mgr, second_branch_seed):
    world = second_branch_seed
    ad_hoc = client_mgr.post(
        "/api/tasks/ad-hoc",
        json=_ad_hoc_payload(world, branch_id=world["branch_id"]),
    )
    assert ad_hoc.status_code == 403
    fixed = client_mgr.post("/api/tasks/templates", json=_fixed_payload())
    assert fixed.status_code == 403
