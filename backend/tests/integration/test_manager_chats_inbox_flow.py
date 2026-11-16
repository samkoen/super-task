"""Intégration : endpoint agrégé des fils de tâche du jour (boîte « שיחות » unifiée du menahel)."""
from __future__ import annotations

import pytest

import app.db.session as db_session
from app.domain import roles
from app.repositories.user_repository import UserRepository
from tests.integration.conftest import MGR_B_EMAIL, PASSWORD, due_at_iso, login_client

NM_EMAIL = "nm.inbox@test.local"
ALL_DAY_CHATS = "/api/tasks/manager-day-chats"


@pytest.fixture()
def client_nm(app, second_branch_seed):
    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        UserRepository(db).create_user(
            email=NM_EMAIL,
            password=PASSWORD,
            first_name="Reshet",
            last_name="Inbox",
            role=roles.NETWORK_MANAGER,
            email_verified=True,
            network_id=second_branch_seed["network_id"],
        )
        db.commit()
    finally:
        db.close()
    return login_client(app, NM_EMAIL)


def _create_task(client, branch_id: str, employee_id: str | None, title: str = "מדף חלב") -> str:
    response = client.post(
        "/api/tasks/ad-hoc",
        json={
            "branch_id": branch_id,
            "title": title,
            "description": "",
            "due_at": due_at_iso(),
            "assignee_user_id": employee_id,
            "photo_required": False,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["occurrence"]["id"]


def _all_day_chats(client) -> dict[str, dict]:
    response = client.get(ALL_DAY_CHATS)
    assert response.status_code == 200, response.text
    return {item["id"]: item for item in response.json()["items"]}


def test_one_call_returns_the_day_threads_with_their_oved(client_mgr, world_seed):
    """Un seul appel = les mêmes fils que l'endpoint par oved, chacun rattaché à son oved."""
    occ_id = _create_task(client_mgr, world_seed["branch_id"], world_seed["employee_id"])
    items = _all_day_chats(client_mgr)
    assert items[occ_id]["assignee_user_id"] == world_seed["employee_id"]
    # Nommé côté serveur : le fil s'affiche même sans conversation directe avec cet oved.
    assert items[occ_id]["assignee_name"] == "Oved Test"
    assert items[occ_id]["unread_count"] == 0
    per_oved = client_mgr.get(f"{ALL_DAY_CHATS}/{world_seed['employee_id']}")
    assert per_oved.status_code == 200, per_oved.text
    assert {i["id"] for i in per_oved.json()["items"]} == set(items)


def test_oved_message_shows_as_unread_with_its_preview(client_mgr, client_emp, chat_seed, mock_i18n):
    """L'oved écrit dans le fil : le menahel le voit non lu, avec l'aperçu, dans la boîte agrégée."""
    occ_id = chat_seed["occurrence_id"]
    posted = client_emp.post(f"/api/tasks/occurrences/{occ_id}/messages", json={"body": "אפשר?"})
    assert posted.status_code == 201, posted.text
    card = _all_day_chats(client_mgr)[occ_id]
    assert card["unread_count"] >= 1
    assert card["last_preview"]
    assert card["last_at"]


def test_branch_manager_only_sees_his_branch(app, client_mgr, second_branch_seed):
    """Menahel snif A : les fils du snif B n'apparaissent pas dans sa boîte."""
    world = second_branch_seed
    mine = _create_task(client_mgr, world["branch_id"], world["employee_id"])
    client_mgr_b = login_client(app, MGR_B_EMAIL)
    theirs = _create_task(client_mgr_b, world["branch_b_id"], world["employee_b_id"])
    items = _all_day_chats(client_mgr)
    assert mine in items
    assert theirs not in items
    assert theirs in _all_day_chats(client_mgr_b)


def test_network_manager_gets_every_branch_in_one_call(app, client_nm, client_mgr, second_branch_seed):
    """Menahel reshet (« כל הרשת ») : les fils de tous les snifim en une seule requête,
    chacun avec son snif pour que la pastille de périmètre (étape 8) puisse restreindre la boîte."""
    world = second_branch_seed
    a = _create_task(client_mgr, world["branch_id"], world["employee_id"])
    b = _create_task(login_client(app, MGR_B_EMAIL), world["branch_b_id"], world["employee_b_id"])
    items = _all_day_chats(client_nm)
    assert items[a]["assignee_user_id"] == world["employee_id"]
    assert items[b]["assignee_user_id"] == world["employee_b_id"]
    assert items[a]["branch_id"] == world["branch_id"]
    assert items[b]["branch_id"] == world["branch_b_id"]


def test_employee_cannot_list_the_manager_inbox(client_emp, world_seed):
    """L'oved n'a pas accès à la boîte agrégée du menahel."""
    assert client_emp.get(ALL_DAY_CHATS).status_code == 403
