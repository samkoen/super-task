"""Intégration : appels serveur des nouveaux écrans menahel (accueil, revue, משימות › היום, studio unique)."""
from __future__ import annotations

from datetime import datetime

import pytest

import app.db.session as db_session
from app.domain import roles
from app.repositories.user_repository import UserRepository
from tests.integration.conftest import PASSWORD, TZ, due_at_iso, login_client

NM_EMAIL = "nm.screens@test.local"


@pytest.fixture()
def client_nm(app, second_branch_seed):
    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        UserRepository(db).create_user(
            email=NM_EMAIL,
            password=PASSWORD,
            first_name="Reshet",
            last_name="Screens",
            role=roles.NETWORK_MANAGER,
            email_verified=True,
            network_id=second_branch_seed["network_id"],
        )
        db.commit()
    finally:
        db.close()
    return login_client(app, NM_EMAIL)


def _create_once(client, world, **over) -> dict:
    body = {
        "branch_id": world["branch_id"],
        "title": "ניקוי מקרר",
        "description": "",
        "due_at": due_at_iso(),
        "assignee_user_id": world["employee_id"],
        "photo_required": True,
    }
    body.update(over)
    response = client.post("/api/tasks/ad-hoc", json=body)
    assert response.status_code == 201, response.text
    return response.json()["occurrence"]


def _submit_photo_proof(client_mgr, client_emp, world, jpeg_bytes) -> str:
    occ_id = _create_once(client_mgr, world)["id"]
    assert client_emp.post(f"/api/tasks/occurrences/{occ_id}/start").status_code == 200
    upload = client_emp.post("/api/tasks/upload-photo", files={"file": ("p.jpg", jpeg_bytes, "image/jpeg")})
    assert upload.status_code == 200, upload.text
    done = client_emp.post(
        f"/api/tasks/occurrences/{occ_id}/complete",
        json={"status": "completed", "photo_path": upload.json()["url"]},
    )
    assert done.status_code == 200, done.text
    return occ_id


def _is_next(row: dict) -> bool:
    return bool(row.get("is_manager_next") or row.get("manager_next_at"))


def _today() -> str:
    return datetime.now(TZ).date().isoformat()


def test_manager_next_mark_is_saved_and_cleared(client_mgr, world_seed):
    """Fiche d'une tâche (onglet משימות) : « המשימה הבאה » cochée puis décochée."""
    occ_id = _create_once(client_mgr, world_seed)["id"]
    marked = client_mgr.post(f"/api/tasks/occurrences/{occ_id}/manager-next", json={"enabled": True})
    assert marked.status_code == 200, marked.text
    assert _is_next(marked.json()["occurrence"])
    listed = {row["id"]: row for row in client_mgr.get("/api/tasks/occurrences").json()}
    assert _is_next(listed[occ_id])

    cleared = client_mgr.post(f"/api/tasks/occurrences/{occ_id}/manager-next", json={"enabled": False})
    assert cleared.status_code == 200, cleared.text
    assert not _is_next(cleared.json()["occurrence"])


def test_confirm_media_reports_a_photo_proof_ready(client_mgr, client_emp, world_seed, jpeg_bytes):
    """Revue plein écran : la décision n'attend pas quand la preuve est une photo."""
    occ_id = _submit_photo_proof(client_mgr, client_emp, world_seed, jpeg_bytes)
    confirmed = client_mgr.post(f"/api/tasks/occurrences/{occ_id}/confirm-media")
    assert confirmed.status_code == 200, confirmed.text
    assert confirmed.json()["media_ready"] is True
    occ = client_mgr.get(f"/api/tasks/occurrences/{occ_id}").json()
    assert occ["status"] == "pending_review"


def test_home_inbox_lists_the_proof_to_review(client_mgr, client_emp, world_seed, jpeg_bytes):
    """Accueil (« לטיפולך ») : la preuve envoyée attend dans la file des validations du jour."""
    occ_id = _submit_photo_proof(client_mgr, client_emp, world_seed, jpeg_bytes)
    dash = client_mgr.get("/api/dashboard/manager", params={"due_on": _today()})
    assert dash.status_code == 200, dash.text
    queue = dash.json()["task_queues"]["pending_review"]
    assert occ_id in {(item.get("task") or item)["id"] for item in queue}


def test_network_manager_lists_only_the_chosen_snif(client_nm, second_branch_seed):
    """משימות › היום avec un snif choisi : la liste ne montre que ce snif."""
    world = second_branch_seed
    created = client_nm.post(
        "/api/tasks/ad-hoc",
        json={"title": "ביקור", "description": "", "due_at": due_at_iso(), "photo_required": False, "apply_to_network": True},
    )
    assert created.status_code == 201, created.text
    rows = client_nm.get("/api/tasks/occurrences", params={"branch_id": world["branch_id"]}).json()
    assert rows and {row["branch_id"] for row in rows} == {world["branch_id"]}


def test_studio_one_time_task_for_a_single_snif_of_the_network(client_nm, second_branch_seed):
    """Studio unique, « פעם אחת », un seul snif coché par le menahel reshet : une tâche, chez cet oved."""
    world = second_branch_seed
    occ = _create_once(
        client_nm,
        world,
        branch_id=world["branch_b_id"],
        assignee_user_id=world["employee_b_id"],
        apply_to_network=False,
        completion_requirements=[{"kind": "video", "min_seconds": 10, "title": "מדף עליון"}],
    )
    assert occ["branch_id"] == world["branch_b_id"]
    assert occ["assignee_user_id"] == world["employee_b_id"]
    assert [r["kind"] for r in occ["completion_requirements"]] == ["video"]
    all_rows = client_nm.get("/api/tasks/occurrences").json()
    assert [r["branch_id"] for r in all_rows if r["title"] == "ניקוי מקרר"] == [world["branch_b_id"]]


def test_studio_one_time_task_from_a_library_model(client_mgr, world_seed):
    """Studio ouvert depuis la bibliothèque : la tâche garde le lien vers le modèle et ses étapes."""
    model = client_mgr.post(
        "/api/task-gallery",
        json={
            "title": "תיעוד בסטה",
            "description": "אחרי העמסה",
            "task_kind": "ad_hoc",
            "photo_required": True,
            "completion_requirements": [{"kind": "photo", "title": "בסטה"}],
        },
    )
    assert model.status_code in (200, 201), model.text
    item = model.json()["item"]
    occ = _create_once(
        client_mgr,
        world_seed,
        title=item["title"],
        description=item["description"],
        completion_requirements=item["completion_requirements"],
        source_gallery_item_id=item["id"],
    )
    assert occ["source_gallery_item_id"] == item["id"]
    assert occ["title"] == "תיעוד בסטה"
    assert [r["kind"] for r in occ["completion_requirements"]] == ["photo"]
