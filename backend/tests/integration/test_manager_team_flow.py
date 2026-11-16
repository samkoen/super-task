"""Intégration : appels serveur de l'onglet « צוות » et de la fiche employé (étape 6)."""
from __future__ import annotations

from datetime import datetime

import pytest

import app.db.session as db_session
from app.domain import roles
from app.repositories.user_repository import UserRepository
from tests.integration.conftest import PASSWORD, TZ, due_at_iso, login_client

NM_EMAIL = "nm.team@test.local"


@pytest.fixture()
def client_nm(app, second_branch_seed):
    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        UserRepository(db).create_user(
            email=NM_EMAIL,
            password=PASSWORD,
            first_name="Reshet",
            last_name="Team",
            role=roles.NETWORK_MANAGER,
            email_verified=True,
            network_id=second_branch_seed["network_id"],
        )
        db.commit()
    finally:
        db.close()
    return login_client(app, NM_EMAIL)


def _today() -> str:
    return datetime.now(TZ).date().isoformat()


def _create_once_for(client, branch_id: str, employee_id: str, title: str = "ספירת מלאי") -> str:
    response = client.post(
        "/api/tasks/ad-hoc",
        json={
            "branch_id": branch_id,
            "title": title,
            "description": "",
            "due_at": due_at_iso(),
            "assignee_user_id": employee_id,
            "photo_required": True,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["occurrence"]["id"]


def _team_ids(client, **params) -> set[str]:
    response = client.get("/api/users/team", params={"role": "employee", **params})
    assert response.status_code == 200, response.text
    return {row["id"] for row in response.json()}


def test_team_tab_shows_the_branch_oveds_and_their_day(client_mgr, world_seed):
    """Menahel snif : la liste des comptes et l'état du jour (tâches, notes de qualité) de chaque oved."""
    _create_once_for(client_mgr, world_seed["branch_id"], world_seed["employee_id"])
    assert world_seed["employee_id"] in _team_ids(client_mgr)
    dash = client_mgr.get("/api/dashboard/manager", params={"due_on": _today()})
    assert dash.status_code == 200, dash.text
    team = {m["user_id"]: m for m in dash.json()["team"]}
    member = team[world_seed["employee_id"]]
    assert member["total_today"] >= 1
    assert "quality_rating" in member
    assert {"status", "current_task_title", "timeline", "overdue_backlog"} <= set(member)


def test_employee_sheet_lists_his_day_and_opens_the_direct_chat(client_mgr, world_seed):
    """Fiche employé : ses tâches du jour (filtrées sur lui côté écran) et le chat direct avec lui."""
    occ_id = _create_once_for(client_mgr, world_seed["branch_id"], world_seed["employee_id"])
    rows = client_mgr.get("/api/tasks/occurrences", params={"branch_id": world_seed["branch_id"], "due_on": _today()})
    assert rows.status_code == 200, rows.text
    mine = [r for r in rows.json() if r["assignee_user_id"] == world_seed["employee_id"]]
    assert occ_id in {r["id"] for r in mine}
    opened = client_mgr.post(f"/api/direct-chats/with/{world_seed['employee_id']}")
    assert opened.status_code == 200, opened.text
    assert opened.json()["conversation"]["id"]


def test_network_view_lists_every_snif_and_a_chosen_snif_has_its_live_team(client_nm, second_branch_seed):
    """Menahel reshet : « כל הרשת » liste les oveds de tous les snifim ; un snif choisi donne leur état du jour."""
    world = second_branch_seed
    assert {world["employee_id"], world["employee_b_id"]} <= _team_ids(client_nm)
    overview = client_nm.get("/api/dashboard/manager", params={"due_on": _today()})
    assert overview.status_code == 200, overview.text
    # Réseau sans « gère tous les oveds » : pas d'état du jour en vue réseau (l'écran invite à choisir un snif).
    assert overview.json()["team"] is None
    branch_b = client_nm.get("/api/dashboard/manager", params={"branch_id": world["branch_b_id"], "due_on": _today()})
    assert branch_b.status_code == 200, branch_b.text
    team_b = {m["user_id"] for m in branch_b.json()["team"]}
    assert world["employee_b_id"] in team_b, (team_b, world)
    assert world["employee_id"] not in team_b


def test_network_view_has_the_live_team_when_the_network_manages_all_workers(client_nm, second_branch_seed):
    """Réseau « gère tous les oveds » : la vue « כל הרשת » donne l'état du jour de tous les oveds."""
    world = second_branch_seed
    flag = client_nm.patch(f"/api/networks/{world['network_id']}", json={"manages_all_workers": True})
    assert flag.status_code == 200, flag.text
    overview = client_nm.get("/api/dashboard/manager", params={"due_on": _today()}).json()
    assert {world["employee_id"], world["employee_b_id"]} <= {m["user_id"] for m in overview["team"] or []}


def test_account_access_from_the_team_tab(client_mgr, world_seed):
    """« ניהול חשבון » : couper l'accès garde l'oved dans la liste (section « ללא גישה »), puis le rendre."""
    emp = world_seed["employee_id"]
    revoked = client_mgr.patch(f"/api/users/team/{emp}/access", json={"is_active": False})
    assert revoked.status_code == 200, revoked.text
    rows = {r["id"]: r for r in client_mgr.get("/api/users/team", params={"role": "employee"}).json()}
    assert rows[emp]["is_active"] is False
    granted = client_mgr.patch(f"/api/users/team/{emp}/access", json={"is_active": True})
    assert granted.status_code == 200, granted.text
    assert granted.json()["user"]["is_active"] is True
