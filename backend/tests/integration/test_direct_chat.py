"""Intégration chat hors tâche : oved ↔ menahel, refus, média, diffusion."""
from __future__ import annotations

from fastapi.testclient import TestClient

import app.db.session as db_session
from app.domain import roles
from app.repositories.user_repository import UserRepository
from tests.integration.conftest import (
    EMP_B_EMAIL,
    MGR_B_EMAIL,
    MGR_EMAIL,
    PASSWORD,
    login_client,
)

NM_EMAIL = "chat.nm@test.local"


def _open_mine(client: TestClient) -> str:
    response = client.post("/api/direct-chats/mine")
    assert response.status_code == 200, response.text
    return response.json()["conversation"]["id"]


def _last(client: TestClient, conversation_id: str) -> dict:
    response = client.get(f"/api/direct-chats/{conversation_id}/messages")
    assert response.status_code == 200, response.text
    items = response.json()["messages"]
    assert items, "expected at least one message"
    return items[-1]


def test_oved_text_reaches_menahel(client_emp, client_mgr, world_seed):
    conv_id = _open_mine(client_emp)
    posted = client_emp.post(
        f"/api/direct-chats/{conv_id}/messages",
        json={"body": "המקרר נשבר"},
    )
    assert posted.status_code == 200, posted.text
    assert posted.json()["message"]["body"] == "המקרר נשבר"

    inbox = client_mgr.get("/api/direct-chats")
    assert inbox.status_code == 200, inbox.text
    card = next(
        item
        for item in inbox.json()["items"]
        if item["counterpart_user_id"] == world_seed["employee_id"]
    )
    assert card["unread_count"] >= 1
    assert card["last_preview"] == "המקרר נשבר"

    opened = client_mgr.post(f"/api/direct-chats/with/{world_seed['employee_id']}")
    assert opened.status_code == 200, opened.text
    assert opened.json()["messages"][-1]["body"] == "המקרר נשבר"


def test_menahel_reply_reaches_oved(client_emp, client_mgr, world_seed):
    conv_id = _open_mine(client_emp)
    assert client_emp.post(
        f"/api/direct-chats/{conv_id}/messages", json={"body": "שאלה"}
    ).status_code == 200
    reply = client_mgr.post(
        f"/api/direct-chats/{conv_id}/messages", json={"body": "בסדר"}
    )
    assert reply.status_code == 200, reply.text
    unread = client_emp.get("/api/direct-chats")
    assert unread.status_code == 200
    assert unread.json()["unread_count"] >= 1
    assert _last(client_emp, conv_id)["body"] == "בסדר"
    after_read = client_emp.get("/api/direct-chats")
    assert after_read.json()["unread_count"] == 0


def test_empty_direct_message_rejected(client_emp):
    conv_id = _open_mine(client_emp)
    denied = client_emp.post(f"/api/direct-chats/{conv_id}/messages", json={"body": "  "})
    assert denied.status_code == 400


def test_oved_cannot_open_chat_with_peer(client_emp, world_seed):
    denied = client_emp.post(f"/api/direct-chats/with/{world_seed['manager_id']}")
    assert denied.status_code == 403


def test_other_snif_cannot_read_thread(client_emp, client_mgr, second_branch_seed, app):
    conv_id = _open_mine(client_emp)
    assert client_emp.post(
        f"/api/direct-chats/{conv_id}/messages", json={"body": "פרטי"}
    ).status_code == 200
    other = login_client(app, EMP_B_EMAIL)
    assert other.get(f"/api/direct-chats/{conv_id}/messages").status_code == 403
    mgr_b = login_client(app, MGR_B_EMAIL)
    assert mgr_b.get(f"/api/direct-chats/{conv_id}/messages").status_code == 403
    assert client_mgr.get(f"/api/direct-chats/{conv_id}/messages").status_code == 200


def test_photo_message(client_emp, client_mgr, jpeg_bytes):
    conv_id = _open_mine(client_emp)
    upload = client_emp.post(
        "/api/direct-chats/upload-photo",
        files={"file": ("shot.jpg", jpeg_bytes, "image/jpeg")},
    )
    assert upload.status_code == 200, upload.text
    url = upload.json()["url"]
    posted = client_emp.post(
        f"/api/direct-chats/{conv_id}/messages", json={"photo_url": url}
    )
    assert posted.status_code == 200, posted.text
    assert _last(client_mgr, conv_id)["photo_url"] == url


def test_broadcast_reaches_oved(client_emp, client_mgr):
    sent = client_mgr.post("/api/direct-chats/broadcast", json={"body": "מחר פתיחה ב-7"})
    assert sent.status_code == 200, sent.text
    assert sent.json()["count"] >= 1
    conv_id = _open_mine(client_emp)
    assert _last(client_emp, conv_id)["body"] == "מחר פתיחה ב-7"


def test_network_manager_cannot_open_oved_chat(app, world_seed, client_emp):
    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        UserRepository(db).create_user(
            email=NM_EMAIL,
            password=PASSWORD,
            first_name="Reshet",
            last_name="Test",
            role=roles.NETWORK_MANAGER,
            email_verified=True,
            network_id=world_seed["network_id"],
            branch_id=None,
        )
        db.commit()
    finally:
        db.close()
    conv_id = _open_mine(client_emp)
    nm = login_client(app, NM_EMAIL)
    assert nm.post(f"/api/direct-chats/with/{world_seed['employee_id']}").status_code == 403
    assert nm.get(f"/api/direct-chats/{conv_id}/messages").status_code == 403
    opened = nm.post(f"/api/direct-chats/with/{world_seed['manager_id']}")
    assert opened.status_code == 200, opened.text
    posted = nm.post(
        f"/api/direct-chats/{opened.json()['conversation']['id']}/messages",
        json={"body": "עדכון רשת"},
    )
    assert posted.status_code == 200, posted.text
    mgr = login_client(app, MGR_EMAIL)
    inbox = mgr.get("/api/direct-chats")
    assert inbox.json()["up"]["last_preview"] == "עדכון רשת"


def test_network_manager_chats_with_oved_when_configured(app, world_seed, client_emp):
    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        UserRepository(db).create_user(
            email="chat.nm.flag@test.local",
            password=PASSWORD,
            first_name="Reshet",
            last_name="Flag",
            role=roles.NETWORK_MANAGER,
            email_verified=True,
            network_id=world_seed["network_id"],
            branch_id=None,
        )
        db.commit()
    finally:
        db.close()
    nm = login_client(app, "chat.nm.flag@test.local")
    assert nm.post(f"/api/direct-chats/with/{world_seed['employee_id']}").status_code == 403
    toggled = nm.patch(
        f"/api/networks/{world_seed['network_id']}",
        json={"manages_all_workers": True},
    )
    assert toggled.status_code == 200, toggled.text
    assert toggled.json()["network"]["manages_all_workers"] is True
    opened = nm.post(f"/api/direct-chats/with/{world_seed['employee_id']}")
    assert opened.status_code == 200, opened.text
    conv_id = opened.json()["conversation"]["id"]
    posted = nm.post(f"/api/direct-chats/{conv_id}/messages", json={"body": "שלום רשת"})
    assert posted.status_code == 200, posted.text
    assert client_emp.get(f"/api/direct-chats/{conv_id}/messages").status_code == 200
    mine = client_emp.post("/api/direct-chats/mine", params={"scope": "network"})
    assert mine.status_code == 200, mine.text
    assert mine.json()["conversation"]["id"] == conv_id
    inbox = client_emp.get("/api/direct-chats")
    scopes = {item["scope"] for item in inbox.json()["managers"]}
    assert "network" in scopes
