"""Intégration : « לא ניתן לצלם » — l'oved explique pourquoi une sous-tâche n'est pas faite, le menahel la voit."""
from __future__ import annotations

from tests.integration.test_slot_review_flow import _review
from tests.integration.test_slot_submit_flow import _photo, _started, _submit

REQS = [{"kind": "photo", "title": "מדף"}, {"kind": "photo", "title": "קופה"}, {"kind": "photo", "title": "בסטה"}]


def _audio(client) -> str:
    upload = client.post(
        "/api/tasks/upload-audio",
        files={"file": ("why.webm", b"fake-audio-bytes", "audio/webm")},
    )
    assert upload.status_code == 200, upload.text
    return upload.json()["url"]


def _skip(code: str = "area_blocked", **extra) -> dict:
    return {"kind": "photo", "skipped": {"reason_code": code, **extra}}


def test_skipped_slot_lets_the_task_reach_the_manager_with_its_reason(
    client_mgr, client_emp, world_seed, jpeg_bytes
):
    occ_id = _started(client_mgr, client_emp, world_seed, REQS)
    assert _submit(client_emp, occ_id, 0, _photo(client_emp, jpeg_bytes)).status_code == 200
    assert _submit(client_emp, occ_id, 1, _photo(client_emp, jpeg_bytes, "b.jpg")).json()["pending_slots"] == [2]
    audio = _audio(client_emp)

    last = _submit(client_emp, occ_id, 2, _skip(reason_text="השער נעול", audio_url=audio))

    assert last.status_code == 200, last.text
    body = last.json()
    assert body["task_submitted"] is True
    assert body["occurrence"]["status"] == "pending_review"
    skipped = body["occurrence"]["completion"]["completion_attachments"][2]
    assert skipped["url"] == ""
    assert skipped["skipped"] == {
        "reason_code": "area_blocked",
        "reason_text": "השער נעול",
        "audio_url": audio,
    }


def test_manager_reviews_only_filmed_slots_when_one_was_skipped(
    client_mgr, client_emp, world_seed, jpeg_bytes
):
    occ_id = _started(client_mgr, client_emp, world_seed, REQS)
    _submit(client_emp, occ_id, 0, _photo(client_emp, jpeg_bytes))
    _submit(client_emp, occ_id, 1, _photo(client_emp, jpeg_bytes, "b.jpg"))
    _submit(client_emp, occ_id, 2, _skip("no_stock"))

    reviewed = _review(
        client_mgr,
        occ_id,
        [{"index": 0, "status": "approved"}, {"index": 1, "status": "approved"}],
        quality_rating=4,
    )

    assert reviewed.status_code == 200, reviewed.text
    assert reviewed.json()["occurrence"]["status"] == "completed"
    assert "review" not in reviewed.json()["occurrence"]["completion"]["completion_attachments"][2]


def test_skipping_every_slot_still_reaches_the_manager(client_mgr, client_emp, world_seed):
    occ_id = _started(client_mgr, client_emp, world_seed, REQS[:2])
    assert _submit(client_emp, occ_id, 0, _skip("camera_issue")).json()["pending_slots"] == [1]
    done = _submit(client_emp, occ_id, 1, _skip("no_stock"))
    assert done.json()["occurrence"]["status"] == "pending_review"


def test_skipped_slot_can_be_filmed_later_before_the_task_is_submitted(
    client_mgr, client_emp, world_seed, jpeg_bytes
):
    occ_id = _started(client_mgr, client_emp, world_seed, REQS[:2])
    first = _submit(client_emp, occ_id, 0, _skip())
    assert first.json()["pending_slots"] == [1]
    filmed = _photo(client_emp, jpeg_bytes)
    assert _submit(client_emp, occ_id, 0, filmed).status_code == 200
    done = _submit(client_emp, occ_id, 1, _photo(client_emp, jpeg_bytes, "b.jpg"))
    first_item = done.json()["occurrence"]["completion"]["completion_attachments"][0]
    assert first_item["url"] == filmed["url"] and "skipped" not in first_item


def test_resending_the_same_skip_after_a_network_cut_is_idempotent(client_mgr, client_emp, world_seed):
    occ_id = _started(client_mgr, client_emp, world_seed, REQS[:2])
    assert _submit(client_emp, occ_id, 0, _skip("no_stock")).status_code == 200
    again = _submit(client_emp, occ_id, 0, _skip("no_stock"))
    assert again.status_code == 200, again.text
    assert again.json()["pending_slots"] == [1]


def test_invalid_reasons_are_rejected(client_mgr, client_emp, world_seed):
    occ_id = _started(client_mgr, client_emp, world_seed, REQS[:2])
    assert _submit(client_emp, occ_id, 0, _skip("whatever")).status_code == 400
    assert _submit(client_emp, occ_id, 0, _skip("other")).status_code == 400
    assert _submit(client_emp, occ_id, 0, _skip(audio_url="javascript:x")).status_code == 400
    assert _submit(client_emp, occ_id, 0, {"kind": "video", "skipped": {"reason_code": "no_stock"}}).status_code == 400
