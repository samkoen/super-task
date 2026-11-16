"""Intégration : l'oved envoie chaque sous-tâche séparément, la dernière déclenche le contrôle."""
from __future__ import annotations

from tests.integration.conftest import due_at_iso
from tests.integration.test_slot_review_flow import _find_card

REQS = [
    {"kind": "photo", "title": "מדף"},
    {"kind": "video", "min_seconds": 10, "title": "מקרר"},
    {"kind": "photo", "title": "קופה"},
]


def _upload(client, kind: str, name: str, data: bytes, content_type: str) -> str:
    upload = client.post(f"/api/tasks/upload-{kind}", files={"file": (name, data, content_type)})
    assert upload.status_code == 200, upload.text
    return upload.json()["url"]


def _photo(client, jpeg_bytes: bytes, name: str = "a.jpg") -> dict:
    return {"kind": "photo", "url": _upload(client, "photo", name, jpeg_bytes, "image/jpeg")}


def _video(client, seconds: int = 12) -> dict:
    url = _upload(client, "video", "v.webm", b"webm-fake", "video/webm")
    return {"kind": "video", "url": url, "duration_seconds": seconds}


def _started(client_mgr, client_emp, world_seed, reqs=None) -> str:
    created = client_mgr.post(
        "/api/tasks/ad-hoc",
        json={
            "branch_id": world_seed["branch_id"],
            "title": "פתיחת בדיקה",
            "description": "לצלם",
            "due_at": due_at_iso(),
            "assignee_user_id": world_seed["employee_id"],
            "photo_required": False,
            "completion_requirements": REQS if reqs is None else reqs,
        },
    )
    assert created.status_code == 201, created.text
    occ_id = created.json()["occurrence"]["id"]
    assert client_emp.post(f"/api/tasks/occurrences/{occ_id}/start").status_code == 200
    return occ_id


def _submit(client, occ_id: str, index: int, attachment: dict):
    return client.post(
        f"/api/tasks/occurrences/{occ_id}/slots/{index}/submit",
        json={"attachment": attachment},
    )


def test_slots_are_sent_one_by_one_and_last_one_closes_the_task(
    client_mgr, client_emp, world_seed, jpeg_bytes
):
    occ_id = _started(client_mgr, client_emp, world_seed)

    first = _submit(client_emp, occ_id, 1, _video(client_emp))
    assert first.status_code == 200, first.text
    body = first.json()
    assert body["task_submitted"] is False
    assert body["pending_slots"] == [0, 2]
    assert body["occurrence"]["status"] == "in_progress"

    second = _submit(client_emp, occ_id, 0, _photo(client_emp, jpeg_bytes))
    assert second.json()["pending_slots"] == [2]
    assert second.json()["occurrence"]["status"] == "in_progress"

    last = _submit(client_emp, occ_id, 2, _photo(client_emp, jpeg_bytes, "c.jpg"))
    assert last.status_code == 200, last.text
    done = last.json()
    assert done["task_submitted"] is True
    assert done["pending_slots"] == []
    assert done["occurrence"]["status"] == "pending_review"
    attachments = done["occurrence"]["completion"]["completion_attachments"]
    assert [item["kind"] for item in attachments] == ["photo", "video", "photo"]
    assert done["occurrence"]["completion"]["manager_review_status"] == "pending"


def test_sent_slots_are_visible_in_oved_card_while_task_is_in_progress(
    client_mgr, client_emp, world_seed, jpeg_bytes
):
    occ_id = _started(client_mgr, client_emp, world_seed)
    sent = _photo(client_emp, jpeg_bytes)
    assert _submit(client_emp, occ_id, 0, sent).status_code == 200
    card = _find_card(client_emp.get("/api/dashboard/employee").json(), occ_id)
    completion = card["completion"]
    assert card["status"] == "in_progress"
    assert completion["completion_attachments"][0]["url"] == sent["url"]
    assert completion["completion_attachments"][1]["url"] == ""


def test_resending_same_slot_after_network_cut_is_idempotent(
    client_mgr, client_emp, world_seed, jpeg_bytes
):
    occ_id = _started(client_mgr, client_emp, world_seed, [{"kind": "photo"}, {"kind": "photo"}])
    first = _photo(client_emp, jpeg_bytes)
    assert _submit(client_emp, occ_id, 0, first).status_code == 200
    again = _submit(client_emp, occ_id, 0, first)
    assert again.status_code == 200, again.text
    assert again.json()["pending_slots"] == [1]

    last = _photo(client_emp, jpeg_bytes, "b.jpg")
    assert _submit(client_emp, occ_id, 1, last).json()["task_submitted"] is True
    replay = _submit(client_emp, occ_id, 1, last)
    assert replay.status_code == 200, replay.text
    assert replay.json()["occurrence"]["status"] == "pending_review"
    assert replay.json()["task_submitted"] is True


def test_replacing_a_sent_slot_before_the_end_keeps_one_attachment_per_slot(
    client_mgr, client_emp, world_seed, jpeg_bytes
):
    occ_id = _started(client_mgr, client_emp, world_seed, [{"kind": "photo"}, {"kind": "photo"}])
    assert _submit(client_emp, occ_id, 0, _photo(client_emp, jpeg_bytes)).status_code == 200
    better = _photo(client_emp, jpeg_bytes, "better.jpg")
    assert _submit(client_emp, occ_id, 0, better).status_code == 200
    done = _submit(client_emp, occ_id, 1, _photo(client_emp, jpeg_bytes, "b.jpg"))
    attachments = done.json()["occurrence"]["completion"]["completion_attachments"]
    assert len(attachments) == 2
    assert attachments[0]["url"] == better["url"]


def test_unknown_slot_and_wrong_kind_and_short_video_are_rejected(
    client_mgr, client_emp, world_seed, jpeg_bytes
):
    occ_id = _started(client_mgr, client_emp, world_seed)
    photo = _photo(client_emp, jpeg_bytes)
    assert _submit(client_emp, occ_id, 7, photo).status_code == 400
    assert _submit(client_emp, occ_id, 1, photo).status_code == 400
    assert _submit(client_emp, occ_id, 1, _video(client_emp, seconds=3)).status_code == 400
    assert _submit(client_emp, occ_id, 0, {"kind": "photo", "url": ""}).status_code == 400


def test_slot_submit_requires_started_task(client_mgr, client_emp, world_seed, jpeg_bytes):
    created = client_mgr.post(
        "/api/tasks/ad-hoc",
        json={
            "branch_id": world_seed["branch_id"],
            "title": "לא התחיל",
            "description": "x",
            "due_at": due_at_iso(),
            "assignee_user_id": world_seed["employee_id"],
            "photo_required": False,
            "completion_requirements": [{"kind": "photo"}, {"kind": "photo"}],
        },
    )
    occ_id = created.json()["occurrence"]["id"]
    response = _submit(client_emp, occ_id, 0, _photo(client_emp, jpeg_bytes))
    assert response.status_code == 400, response.text


def test_task_without_slots_rejects_slot_submit(client_mgr, client_emp, world_seed, jpeg_bytes):
    occ_id = _started(client_mgr, client_emp, world_seed, [])
    response = _submit(client_emp, occ_id, 0, _photo(client_emp, jpeg_bytes))
    assert response.status_code == 400, response.text


def test_rejected_slot_must_be_replaced_before_task_goes_back_to_review(
    client_mgr, client_emp, world_seed, jpeg_bytes, mock_i18n
):
    reqs = [{"kind": "photo"}, {"kind": "photo"}]
    occ_id = _started(client_mgr, client_emp, world_seed, reqs)
    for index in (0, 1):
        _submit(client_emp, occ_id, index, _photo(client_emp, jpeg_bytes, f"{index}.jpg"))
    reviewed = client_mgr.post(
        f"/api/tasks/occurrences/{occ_id}/review-slots",
        json={
            "decisions": [
                {"index": 0, "status": "rejected", "remark": "flou"},
                {"index": 1, "status": "rejected", "remark": "sombre"},
            ]
        },
    )
    assert reviewed.status_code == 200, reviewed.text
    assert reviewed.json()["occurrence"]["status"] == "in_progress"

    first = _submit(client_emp, occ_id, 0, _photo(client_emp, jpeg_bytes, "n0.jpg"))
    assert first.json()["task_submitted"] is False
    assert first.json()["pending_slots"] == [1]
    last = _submit(client_emp, occ_id, 1, _photo(client_emp, jpeg_bytes, "n1.jpg"))
    assert last.json()["occurrence"]["status"] == "pending_review"


def test_manager_cannot_submit_slot_of_other_branch_task(
    client_mgr, client_emp, world_seed, jpeg_bytes, app, second_branch_seed
):
    from tests.integration.conftest import MGR_B_EMAIL, login_client

    occ_id = _started(client_mgr, client_emp, world_seed)
    other = login_client(app, MGR_B_EMAIL)
    response = _submit(other, occ_id, 0, _photo(client_emp, jpeg_bytes))
    assert response.status_code in {400, 403, 404}, response.text
