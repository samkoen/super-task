"""Intégration : le menahel crée une tâche à cases ; l'oved voit guides, médias et i18n."""
from __future__ import annotations

from fastapi.testclient import TestClient

from tests.integration.conftest import MGR_B_EMAIL, due_at_iso, login_client
from tests.integration.test_fixed_task_transcript_i18n import _dashboard_tasks, _find_task

TITLE = "בדיקת משבצות מדף"
DESCRIPTION = "לצלם מדף ומקרר לפי הדוגמה"
PHOTO_HINT = "לצלם את כל השורה"
VIDEO_HINT = "להראות את הקופה עשר שניות"
SHELF_TITLE = "מדף חלב"
FRIDGE_TITLE = "מקרר"
TILL_TITLE = "קופה"


def _upload(client: TestClient, kind: str, name: str, data: bytes, content_type: str) -> str:
    upload = client.post(
        f"/api/tasks/upload-{kind}",
        files={"file": (name, data, content_type)},
    )
    assert upload.status_code == 200, upload.text
    url = upload.json()["url"]
    assert url
    return url


def _example_photo(client_mgr: TestClient, jpeg_bytes: bytes, name: str) -> str:
    return _upload(client_mgr, "photo", name, jpeg_bytes, "image/jpeg")


def _guided_requirements(shelf: str, fridge: str, till: str) -> list[dict]:
    return [
        {
            "kind": "photo",
            "title": SHELF_TITLE,
            "hint": PHOTO_HINT,
            "example_url": shelf,
        },
        {
            "kind": "photo",
            "title": FRIDGE_TITLE,
            "hint": PHOTO_HINT,
            "example_url": fridge,
        },
        {
            "kind": "video",
            "min_seconds": 10,
            "title": TILL_TITLE,
            "hint": VIDEO_HINT,
            "example_url": till,
        },
        {"kind": "audio"},
    ]


def _create_guided_ad_hoc(client_mgr, world_seed, jpeg_bytes) -> dict:
    shelf = _example_photo(client_mgr, jpeg_bytes, "shelf.jpg")
    fridge = _example_photo(client_mgr, jpeg_bytes, "fridge.jpg")
    till = _example_photo(client_mgr, jpeg_bytes, "till.jpg")
    audio = _upload(client_mgr, "audio", "brief.mp3", b"ID3guided-audio", "audio/mpeg")
    created = client_mgr.post(
        "/api/tasks/ad-hoc",
        json={
            "branch_id": world_seed["branch_id"],
            "title": TITLE,
            "description": DESCRIPTION,
            "due_at": due_at_iso(),
            "assignee_user_id": world_seed["employee_id"],
            "photo_required": False,
            "reference_audio_url": audio,
            "completion_requirements": _guided_requirements(shelf, fridge, till),
        },
    )
    assert created.status_code == 201, created.text
    return created.json()["occurrence"]


def _oved_card(client_emp: TestClient, *, title: str = TITLE) -> dict:
    dash = client_emp.get("/api/dashboard/employee")
    assert dash.status_code == 200, dash.text
    body = dash.json()
    assert body["employee"]["preferred_language"] == "th"
    hit = _find_task(_dashboard_tasks(body), title=title)
    assert hit is not None, body
    return hit


def _assert_visual_slots(reqs: list[dict], occ: dict) -> None:
    assert [item["kind"] for item in reqs] == ["photo", "photo", "video", "audio"]
    assert reqs[0]["title"] == SHELF_TITLE
    assert reqs[1]["title"] == FRIDGE_TITLE
    assert reqs[2]["title"] == TILL_TITLE
    assert reqs[0]["hint"] == PHOTO_HINT
    assert reqs[2]["hint"] == VIDEO_HINT
    assert reqs[2]["min_seconds"] == 10
    assert reqs[3] == {"kind": "audio"}
    assert occ.get("reference_audio_url")
    for item in reqs[:3]:
        assert (item.get("example_url") or "").startswith("/uploads/")


def _patch_oved_i18n(monkeypatch) -> None:
    async def fake_translate_cards(self, cards, *, language):
        return [
            {
                "id": card["id"],
                "title": f"{card['title']}->{language}",
                "description": f"{card['description']}->{language}",
                "spoken_text": f"{card['title']}. {card['description']}->{language}",
                "display_language": language,
                "translation_pending": False,
                "title_he": card["title"],
            }
            for card in cards
        ]

    async def fake_localize(text, *, source_language, target_language):
        if source_language == target_language:
            return text
        return f"{text}->{target_language}"

    async def fake_tts(*, text, language):
        return f"tts:{language}:{text}".encode("utf-8")

    async def fake_transcribe(audio_url, *, manager_language):
        return f"transcript-{manager_language}:{audio_url}"

    monkeypatch.setattr(
        "app.services.task_translation_service.TaskTranslationService.translate_cards",
        fake_translate_cards,
    )
    monkeypatch.setattr("app.controllers.ai_controller.localize_text", fake_localize)
    monkeypatch.setattr(
        "app.controllers.ai_controller._tts_service.synthesize",
        fake_tts,
    )
    monkeypatch.setattr(
        "app.controllers.ai_controller.transcribe_reference_audio",
        fake_transcribe,
    )


def test_menahel_guided_slots_appear_on_oved_dashboard(
    client_mgr, client_emp, world_seed, jpeg_bytes, monkeypatch
):
    _patch_oved_i18n(monkeypatch)
    occ = _create_guided_ad_hoc(client_mgr, world_seed, jpeg_bytes)
    card = _oved_card(client_emp)
    assert card["id"] == occ["id"]
    assert card["title"].endswith("->th")
    assert card["description"].endswith("->th")
    assert card["title_he"] == TITLE
    assert card["display_language"] == "th"
    _assert_visual_slots(card["completion_requirements"], card)
    assert card["reference_audio_url"] == occ["reference_audio_url"]


def test_oved_can_read_example_photos_other_branch_cannot(
    client_mgr, client_emp, world_seed, jpeg_bytes, app, second_branch_seed, monkeypatch
):
    _patch_oved_i18n(monkeypatch)
    occ = _create_guided_ad_hoc(client_mgr, world_seed, jpeg_bytes)
    card = _oved_card(client_emp)
    example = card["completion_requirements"][0]["example_url"]
    allowed = client_emp.get("/api/media/proxy", params={"src": example})
    assert allowed.status_code == 200, allowed.text
    assert allowed.headers["content-type"].startswith("image/")
    denied = login_client(app, MGR_B_EMAIL).get("/api/media/proxy", params={"src": example})
    assert denied.status_code == 403
    audio = client_emp.get("/api/media/proxy", params={"src": occ["reference_audio_url"]})
    assert audio.status_code == 200, audio.text


def test_oved_localizes_hints_and_audio_in_several_languages(
    client_mgr, client_emp, world_seed, jpeg_bytes, monkeypatch
):
    _patch_oved_i18n(monkeypatch)
    occ = _create_guided_ad_hoc(client_mgr, world_seed, jpeg_bytes)
    card = _oved_card(client_emp)
    hint = card["completion_requirements"][0]["hint"]
    for lang in ("th", "ar", "fr", "en"):
        translated = client_emp.post(
            "/api/ai/translate-text",
            json={"text": hint, "language": lang, "source_language": "he"},
        )
        assert translated.status_code == 200, translated.text
        assert translated.json()["text"] == f"{hint}->{lang}"
        spoken = client_emp.post("/api/ai/task-tts", json={"text": hint, "language": lang})
        assert spoken.status_code == 200, spoken.text
        assert spoken.content == f"tts:{lang}:{hint}".encode("utf-8")
    same = client_emp.post(
        "/api/ai/translate-text",
        json={"text": hint, "language": "he", "source_language": "he"},
    )
    assert same.json()["text"] == hint
    transcript = client_emp.post(
        "/api/ai/transcribe-reference-audio",
        json={"audio_url": occ["reference_audio_url"]},
    )
    assert transcript.status_code == 200, transcript.text
    assert occ["reference_audio_url"] in transcript.json()["transcript"]


def test_oved_translates_task_title_via_mine_translate(
    client_mgr, client_emp, world_seed, jpeg_bytes, monkeypatch
):
    _patch_oved_i18n(monkeypatch)
    occ = _create_guided_ad_hoc(client_mgr, world_seed, jpeg_bytes)
    translated = client_emp.post("/api/tasks/mine/translate", json={"occurrence_ids": [occ["id"]]})
    assert translated.status_code == 200, translated.text
    item = translated.json()["translations"][0]
    assert item["title"] == f"{TITLE}->th"
    assert item["description"] == f"{DESCRIPTION}->th"
    assert item["display_language"] == "th"


def test_oved_completes_every_guided_slot(
    client_mgr, client_emp, world_seed, jpeg_bytes, monkeypatch
):
    _patch_oved_i18n(monkeypatch)
    occ_id = _create_guided_ad_hoc(client_mgr, world_seed, jpeg_bytes)["id"]
    started = client_emp.post(f"/api/tasks/occurrences/{occ_id}/start")
    assert started.status_code == 200, started.text
    photo_a = _upload(client_emp, "photo", "a.jpg", jpeg_bytes, "image/jpeg")
    photo_b = _upload(client_emp, "photo", "b.jpg", jpeg_bytes, "image/jpeg")
    video = _upload(client_emp, "video", "c.webm", b"webm-fake", "video/webm")
    audio = _upload(client_emp, "audio", "d.mp3", b"ID3oved-note", "audio/mpeg")
    completed = client_emp.post(
        f"/api/tasks/occurrences/{occ_id}/complete",
        json={
            "status": "completed",
            "completion_attachments": [
                {"kind": "photo", "url": photo_a},
                {"kind": "photo", "url": photo_b},
                {"kind": "video", "url": video, "duration_seconds": 12},
                {"kind": "audio", "url": audio},
            ],
        },
    )
    assert completed.status_code == 200, completed.text
    body = completed.json()["occurrence"]
    assert body["status"] == "pending_review"
    attachments = body["completion"]["completion_attachments"]
    assert [item["kind"] for item in attachments] == ["photo", "photo", "video", "audio"]
    assert attachments[2]["duration_seconds"] == 12


def _create_plain_fixed(client_mgr, world_seed) -> str:
    created = client_mgr.post(
        "/api/tasks/templates",
        json={
            "branch_id": world_seed["branch_id"],
            "title": TITLE,
            "description": DESCRIPTION,
            "recurrence": "daily",
            "due_time": "23:59",
            "assignee_user_id": world_seed["employee_id"],
            "completion_requirements": [{"kind": "photo"}, {"kind": "video", "min_seconds": 10}],
        },
    )
    assert created.status_code == 201, created.text
    return created.json()["template"]["id"]


def _add_guides_to_fixed(client_mgr, world_seed, template_id: str, jpeg_bytes) -> tuple[str, str]:
    shelf = _example_photo(client_mgr, jpeg_bytes, "fixed-shelf.jpg")
    till = _example_photo(client_mgr, jpeg_bytes, "fixed-till.jpg")
    patched = client_mgr.patch(
        f"/api/tasks/templates/{template_id}",
        json={
            "title": TITLE,
            "description": DESCRIPTION,
            "due_time": "23:59",
            "assignee_user_id": world_seed["employee_id"],
            "is_active": True,
            "completion_requirements": [
                {"kind": "photo", "title": SHELF_TITLE, "hint": PHOTO_HINT, "example_url": shelf},
                {
                    "kind": "video",
                    "min_seconds": 10,
                    "title": TILL_TITLE,
                    "hint": VIDEO_HINT,
                    "example_url": till,
                },
            ],
        },
    )
    assert patched.status_code == 200, patched.text
    return shelf, till


def test_fixed_template_guides_sync_to_oved_after_edit(
    client_mgr, client_emp, world_seed, jpeg_bytes, monkeypatch
):
    _patch_oved_i18n(monkeypatch)
    template_id = _create_plain_fixed(client_mgr, world_seed)
    shelf, till = _add_guides_to_fixed(client_mgr, world_seed, template_id, jpeg_bytes)
    card = _oved_card(client_emp)
    reqs = card["completion_requirements"]
    assert [item["kind"] for item in reqs] == ["photo", "video"]
    assert reqs[0]["title"] == SHELF_TITLE
    assert reqs[0]["hint"] == PHOTO_HINT
    assert reqs[0]["example_url"] == shelf
    assert reqs[1]["title"] == TILL_TITLE
    assert reqs[1]["example_url"] == till
