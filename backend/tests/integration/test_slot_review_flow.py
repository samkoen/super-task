"""Intégration : le menahel contrôle chaque sous-tâche (V/X) ; tout V accepte, un X rouvre."""
from __future__ import annotations

from tests.integration.conftest import due_at_iso

REQS = [
    {"kind": "photo", "title": "מדף"},
    {"kind": "photo", "title": "מקרר"},
]


def _upload(client, jpeg_bytes: bytes, name: str = "a.jpg") -> str:
    upload = client.post(
        "/api/tasks/upload-photo", files={"file": (name, jpeg_bytes, "image/jpeg")}
    )
    assert upload.status_code == 200, upload.text
    return upload.json()["url"]


def _create_started(client_mgr, client_emp, world_seed) -> str:
    created = client_mgr.post(
        "/api/tasks/ad-hoc",
        json={
            "branch_id": world_seed["branch_id"],
            "title": "בדיקת מדפים",
            "description": "לצלם",
            "due_at": due_at_iso(),
            "assignee_user_id": world_seed["employee_id"],
            "photo_required": False,
            "completion_requirements": REQS,
        },
    )
    assert created.status_code == 201, created.text
    occ_id = created.json()["occurrence"]["id"]
    assert client_emp.post(f"/api/tasks/occurrences/{occ_id}/start").status_code == 200
    return occ_id


def _submit(client_emp, occ_id: str, urls: list[str]):
    return client_emp.post(
        f"/api/tasks/occurrences/{occ_id}/complete",
        json={
            "status": "completed",
            "completion_attachments": [{"kind": "photo", "url": url} for url in urls],
        },
    )


def _review(client_mgr, occ_id: str, decisions: list[dict], **extra):
    return client_mgr.post(
        f"/api/tasks/occurrences/{occ_id}/review-slots",
        json={"decisions": decisions, **extra},
    )


def _pending_review(client_mgr, client_emp, world_seed, jpeg_bytes) -> tuple[str, list[str]]:
    occ_id = _create_started(client_mgr, client_emp, world_seed)
    urls = [_upload(client_emp, jpeg_bytes, "a.jpg"), _upload(client_emp, jpeg_bytes, "b.jpg")]
    assert _submit(client_emp, occ_id, urls).status_code == 200
    return occ_id, urls


def test_all_slots_approved_closes_the_task(client_mgr, client_emp, world_seed, jpeg_bytes):
    occ_id, _ = _pending_review(client_mgr, client_emp, world_seed, jpeg_bytes)
    response = _review(
        client_mgr,
        occ_id,
        [{"index": 0, "status": "approved"}, {"index": 1, "status": "approved"}],
        quality_rating=5,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["outcome"] == "approved"
    assert body["occurrence"]["status"] == "completed"
    completion = body["occurrence"]["completion"]
    assert completion["manager_review_status"] == "approved"
    assert [a["review"]["status"] for a in completion["completion_attachments"]] == [
        "approved",
        "approved",
    ]


def test_one_rejected_slot_reopens_with_remark_visible_to_oved(
    client_mgr, client_emp, world_seed, jpeg_bytes, mock_i18n
):
    occ_id, _ = _pending_review(client_mgr, client_emp, world_seed, jpeg_bytes)
    annotated = _upload(client_mgr, jpeg_bytes, "marked.jpg")
    response = _review(
        client_mgr,
        occ_id,
        [
            {"index": 0, "status": "approved"},
            {"index": 1, "status": "rejected", "remark": "צלם מקרוב", "annotated_url": annotated},
        ],
    )
    assert response.status_code == 200, response.text
    assert response.json()["outcome"] == "rejected"
    assert response.json()["occurrence"]["status"] == "in_progress"

    dash = client_emp.get("/api/dashboard/employee").json()
    card = _find_card(dash, occ_id)
    attachments = card["completion"]["completion_attachments"]
    assert attachments[0]["review"]["status"] == "approved"
    assert attachments[1]["review"]["remark"] == "צלם מקרוב"
    assert attachments[1]["review"]["annotated_url"] == annotated
    served = client_emp.get("/api/media/proxy", params={"src": annotated})
    assert served.status_code == 200, served.text

    messages = client_emp.get(f"/api/tasks/occurrences/{occ_id}/messages").json()["messages"]
    assert any("צלם מקרוב" in (m.get("body") or "") for m in messages)


def test_resubmit_without_new_photo_keeps_old_media_and_asks_review_again(
    client_mgr, client_emp, world_seed, jpeg_bytes, mock_i18n
):
    occ_id, urls = _pending_review(client_mgr, client_emp, world_seed, jpeg_bytes)
    _review(
        client_mgr,
        occ_id,
        [{"index": 0, "status": "approved"}, {"index": 1, "status": "rejected", "remark": "flou"}],
    )
    same_again = _submit(client_emp, occ_id, urls)
    assert same_again.status_code == 200, same_again.text
    attachments = same_again.json()["occurrence"]["completion"]["completion_attachments"]
    assert [a["url"] for a in attachments] == urls
    assert attachments[0]["review"]["status"] == "approved"
    assert "review" not in attachments[1]


def test_resubmit_keeps_approved_slot_and_replaces_rejected_photo(
    client_mgr, client_emp, world_seed, jpeg_bytes, mock_i18n
):
    occ_id, urls = _pending_review(client_mgr, client_emp, world_seed, jpeg_bytes)
    _review(
        client_mgr,
        occ_id,
        [{"index": 0, "status": "approved"}, {"index": 1, "status": "rejected"}],
    )
    fixed = _upload(client_emp, jpeg_bytes, "fixed.jpg")
    resubmitted = _submit(client_emp, occ_id, [urls[0], fixed])
    assert resubmitted.status_code == 200, resubmitted.text
    attachments = resubmitted.json()["occurrence"]["completion"]["completion_attachments"]
    assert attachments[0]["review"]["status"] == "approved"
    assert "review" not in attachments[1]

    final = _review(client_mgr, occ_id, [{"index": 1, "status": "approved"}], quality_rating=4)
    assert final.status_code == 200, final.text
    assert final.json()["outcome"] == "approved"
    assert final.json()["occurrence"]["status"] == "completed"


def test_incomplete_review_is_rejected_and_changes_nothing(
    client_mgr, client_emp, world_seed, jpeg_bytes
):
    occ_id, _ = _pending_review(client_mgr, client_emp, world_seed, jpeg_bytes)
    response = _review(client_mgr, occ_id, [{"index": 0, "status": "approved"}], quality_rating=5)
    assert response.status_code == 400, response.text
    card = _find_card(client_emp.get("/api/dashboard/employee").json(), occ_id)
    assert card["status"] == "pending_review"


def test_approval_without_rating_is_400_and_stores_nothing(
    client_mgr, client_emp, world_seed, jpeg_bytes
):
    occ_id, _ = _pending_review(client_mgr, client_emp, world_seed, jpeg_bytes)
    decisions = [{"index": 0, "status": "approved"}, {"index": 1, "status": "approved"}]
    assert _review(client_mgr, occ_id, decisions).status_code == 400
    assert _review(client_mgr, occ_id, decisions, quality_rating=5).status_code == 200


def test_oved_cannot_review_slots(client_mgr, client_emp, world_seed, jpeg_bytes):
    occ_id, _ = _pending_review(client_mgr, client_emp, world_seed, jpeg_bytes)
    response = _review(
        client_emp,
        occ_id,
        [{"index": 0, "status": "approved"}, {"index": 1, "status": "approved"}],
        quality_rating=5,
    )
    assert response.status_code in {401, 403}, response.text


def test_reopen_closed_clears_slot_reviews(client_mgr, client_emp, world_seed, jpeg_bytes):
    occ_id, _ = _pending_review(client_mgr, client_emp, world_seed, jpeg_bytes)
    _review(
        client_mgr,
        occ_id,
        [{"index": 0, "status": "approved"}, {"index": 1, "status": "approved"}],
        quality_rating=5,
    )
    reopened = client_mgr.post(f"/api/tasks/occurrences/{occ_id}/reopen-closed")
    assert reopened.status_code == 200, reopened.text
    attachments = reopened.json()["occurrence"]["completion"]["completion_attachments"]
    assert all("review" not in item for item in attachments)


def _find_card(dashboard: dict, occ_id: str) -> dict:
    tasks = [
        task
        for value in dashboard.get("task_queues", {}).values()
        for task in value
        if isinstance(task, dict)
    ]
    tasks += [t for key, v in dashboard.items() if key.endswith("_tasks") for t in v]
    hit = next((t for t in tasks if t.get("id") == occ_id), None)
    assert hit is not None, dashboard.keys()
    return hit
