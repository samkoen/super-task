"""Intégration : תמלול קבועה → description → traduction oved."""
from __future__ import annotations

import app.db.session as db_session
from app.domain import task_status
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository


def _fixed_body(world, **over) -> dict:
    body = {
        "branch_id": world["branch_id"],
        "title": "ניקוי מדף",
        "description": "תמלול מהמנהל",
        "recurrence": "daily",
        "due_time": "23:59",
        "assignee_user_id": world["employee_id"],
        "photo_required": False,
    }
    body.update(over)
    return body


def _dashboard_tasks(payload: dict) -> list[dict]:
    keys = (
        "urgent_tasks",
        "in_progress_tasks",
        "today_tasks",
        "awaiting_response_tasks",
        "pending_review_tasks",
        "completed_tasks",
    )
    return [task for key in keys for task in payload.get(key) or []]


def _find_task(tasks: list[dict], *, title: str | None = None, desc: str | None = None):
    for task in tasks:
        if title and title not in (task.get("title") or "") and title not in (
            task.get("title_he") or ""
        ):
            continue
        if desc and desc not in (task.get("description") or ""):
            continue
        return task
    return None


def test_create_fixed_copies_transcript_to_occurrence(client_mgr, world_seed):
    created = client_mgr.post("/api/tasks/templates", json=_fixed_body(world_seed))
    assert created.status_code == 201, created.text
    template = created.json()["template"]
    rows = client_mgr.get("/api/tasks/occurrences").json()
    occ = next(r for r in rows if r.get("template_id") == template["id"])
    assert occ["description"] == "תמלול מהמנהל"
    assert occ["task_kind"] == "fixed"


def test_update_fixed_transcript_syncs_open_occurrence(client_mgr, world_seed):
    created = client_mgr.post("/api/tasks/templates", json=_fixed_body(world_seed))
    template_id = created.json()["template"]["id"]
    patched = client_mgr.patch(
        f"/api/tasks/templates/{template_id}",
        json={
            "title": "ניקוי מדף",
            "description": "תמלול מעודכן",
            "due_time": "23:59",
            "assignee_user_id": world_seed["employee_id"],
            "is_active": True,
        },
    )
    assert patched.status_code == 200, patched.text
    rows = client_mgr.get("/api/tasks/occurrences").json()
    occ = next(r for r in rows if r.get("template_id") == template_id)
    assert occ["description"] == "תמלול מעודכן"
    assert occ["status"] == task_status.PENDING


def test_employee_dashboard_translates_fixed_transcript(
    client_mgr, client_emp, world_seed, monkeypatch
):
    async def fake_translate(self, cards, *, language):
        assert language == "th"
        return [
            {
                "id": card["id"],
                "title": f"{card['title']}->th",
                "description": f"{card['description']}->th",
                "spoken_text": "th",
                "display_language": "th",
                "translation_pending": False,
                "title_he": card["title"],
            }
            for card in cards
        ]

    monkeypatch.setattr(
        "app.services.task_translation_service.TaskTranslationService.translate_cards",
        fake_translate,
    )
    created = client_mgr.post("/api/tasks/templates", json=_fixed_body(world_seed))
    assert created.status_code == 201, created.text
    dash = client_emp.get("/api/dashboard/employee")
    assert dash.status_code == 200, dash.text
    hit = _find_task(_dashboard_tasks(dash.json()), desc="תמלול מהמנהל->th")
    assert hit is not None
    assert hit["title"].endswith("->th")
    assert hit["display_language"] == "th"


def test_employee_dashboard_merges_empty_occurrence_description(
    client_mgr, client_emp, world_seed, monkeypatch
):
    async def fake_translate(self, cards, *, language):
        return [
            {
                "id": card["id"],
                "title": card["title"],
                "description": f"{card['description']}->th",
                "spoken_text": "th",
                "display_language": "th",
                "translation_pending": False,
            }
            for card in cards
        ]

    monkeypatch.setattr(
        "app.services.task_translation_service.TaskTranslationService.translate_cards",
        fake_translate,
    )
    created = client_mgr.post("/api/tasks/templates", json=_fixed_body(world_seed))
    template_id = created.json()["template"]["id"]
    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        occ_repo = TaskOccurrenceRepository(db)
        occ = next(o for o in occ_repo.list_by_template_id(template_id))
        occ_repo.update_title_description(occ.id, title=occ.title, description="")
        db.commit()
    finally:
        db.close()

    dash = client_emp.get("/api/dashboard/employee")
    assert dash.status_code == 200, dash.text
    hit = _find_task(_dashboard_tasks(dash.json()), desc="תמלול מהמנהל->th")
    assert hit is not None
