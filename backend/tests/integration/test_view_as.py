"""Intégration : menahel voit le dashboard oved sans se déconnecter."""
from __future__ import annotations

from app.domain import roles
from tests.integration.conftest import (
    EMP_EMAIL,
    MGR_EMAIL,
    PASSWORD,
    login_client,
)


def test_manager_view_as_employee_sees_oved_dashboard(app, chat_seed):
    client = login_client(app, MGR_EMAIL)
    start = client.post("/api/auth/view-as", json={"user_id": chat_seed["employee_id"]})
    assert start.status_code == 200, start.text
    user = start.json()["user"]
    assert user["id"] == chat_seed["employee_id"]
    assert user["role"] == roles.EMPLOYEE
    assert user["is_preview"] is True
    assert user["preview_real_user"]["id"] == chat_seed["manager_id"]

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["user"]["id"] == chat_seed["employee_id"]
    assert me.json()["user"]["is_preview"] is True

    dash = client.get("/api/dashboard/employee")
    assert dash.status_code == 200, dash.text
    body = dash.json()
    assert body["employee"]["id"] == chat_seed["employee_id"]
    ids = [
        task["id"]
        for key in ("in_progress_tasks", "urgent_tasks", "today_tasks")
        for task in body.get(key, [])
    ]
    assert chat_seed["occurrence_id"] in ids

    manager_dash = client.get("/api/dashboard/manager")
    assert manager_dash.status_code == 403


def test_manager_cannot_view_as_other_branch_employee(app, second_branch_seed):
    client = login_client(app, MGR_EMAIL)
    response = client.post(
        "/api/auth/view-as",
        json={"user_id": second_branch_seed["employee_b_id"]},
    )
    assert response.status_code == 403


def test_employee_cannot_start_view_as(app, world_seed):
    client = login_client(app, EMP_EMAIL)
    response = client.post("/api/auth/view-as", json={"user_id": world_seed["employee_id"]})
    assert response.status_code == 403


def test_exit_view_as_restores_manager(app, world_seed):
    client = login_client(app, MGR_EMAIL)
    client.post("/api/auth/view-as", json={"user_id": world_seed["employee_id"]})
    exited = client.post("/api/auth/exit-view-as")
    assert exited.status_code == 200, exited.text
    user = exited.json()["user"]
    assert user["id"] == world_seed["manager_id"]
    assert user["role"] == roles.BRANCH_MANAGER
    assert user.get("is_preview") is False

    me = client.get("/api/auth/me")
    assert me.json()["user"]["id"] == world_seed["manager_id"]
    assert client.get("/api/dashboard/manager").status_code == 200
    own_dash = client.get("/api/dashboard/employee")
    assert own_dash.status_code == 200
    assert own_dash.json()["employee"]["id"] == world_seed["manager_id"]


def test_view_as_blocks_profile_edit(app, world_seed):
    client = login_client(app, MGR_EMAIL)
    client.post("/api/auth/view-as", json={"user_id": world_seed["employee_id"]})
    response = client.patch(
        "/api/auth/me",
        json={"first_name": "X", "last_name": "Y", "email": EMP_EMAIL},
    )
    assert response.status_code == 403


def test_login_clears_stale_preview(app, world_seed):
    client = login_client(app, MGR_EMAIL)
    client.post("/api/auth/view-as", json={"user_id": world_seed["employee_id"]})
    login = client.post("/api/auth/login", json={"email": MGR_EMAIL, "password": PASSWORD})
    assert login.status_code == 200
    me = client.get("/api/auth/me")
    assert me.json()["user"]["id"] == world_seed["manager_id"]
    assert me.json()["user"].get("is_preview") is not True
