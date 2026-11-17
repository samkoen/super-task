"""Intégration duration_minutes : API → SQLite → dashboard oved (« 15 דק׳ » de l'écran המשימות להיום)."""
from __future__ import annotations

from tests.integration.conftest import due_at_iso

_EMPLOYEE_LISTS = (
    "urgent_tasks",
    "in_progress_tasks",
    "awaiting_response_tasks",
    "pending_review_tasks",
    "today_tasks",
    "completed_tasks",
)


def _create_ad_hoc(client_mgr, world_seed, **extra) -> dict:
    response = client_mgr.post(
        "/api/tasks/ad-hoc",
        json={
            "branch_id": world_seed["branch_id"],
            "title": "בדיקת מלאי במחלקה",
            "due_at": due_at_iso(),
            "assignee_user_id": world_seed["employee_id"],
            "photo_required": False,
            **extra,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["occurrence"]


def _update_occurrence(client_mgr, occ: dict, **extra):
    return client_mgr.post(
        f"/api/tasks/occurrences/{occ['id']}/update",
        json={
            "title": occ["title"],
            "description": occ.get("description") or "",
            "due_at": occ["due_at"],
            "assignee_user_id": occ["assignee_user_id"],
            **extra,
        },
    )


def _employee_card(client_emp, *, occurrence_id: str | None = None, title: str | None = None) -> dict:
    response = client_emp.get("/api/dashboard/employee")
    assert response.status_code == 200, response.text
    body = response.json()
    for key in _EMPLOYEE_LISTS:
        for card in body.get(key) or []:
            if occurrence_id and card["id"] == occurrence_id:
                return card
            if title and (card.get("title_he") or card["title"]) == title:
                return card
    raise AssertionError(f"card not found in employee dashboard ({occurrence_id or title})")


def _get_occurrence(client_mgr, occurrence_id: str) -> dict:
    response = client_mgr.get(f"/api/tasks/occurrences/{occurrence_id}")
    assert response.status_code == 200, response.text
    return response.json()


# --- tâche מזדמנת -----------------------------------------------------------


def test_ad_hoc_duration_reaches_employee_dashboard(client_mgr, client_emp, world_seed):
    occ = _create_ad_hoc(client_mgr, world_seed, duration_minutes=15)
    assert occ["duration_minutes"] == 15
    assert _get_occurrence(client_mgr, occ["id"])["duration_minutes"] == 15
    assert _employee_card(client_emp, occurrence_id=occ["id"])["duration_minutes"] == 15


def test_ad_hoc_without_duration_is_null(client_mgr, client_emp, world_seed):
    occ = _create_ad_hoc(client_mgr, world_seed)
    assert occ["duration_minutes"] is None
    assert _employee_card(client_emp, occurrence_id=occ["id"])["duration_minutes"] is None


def test_ad_hoc_duration_accepts_numeric_string(client_mgr, world_seed):
    assert _create_ad_hoc(client_mgr, world_seed, duration_minutes="20")["duration_minutes"] == 20


def test_ad_hoc_rejects_out_of_range_duration(client_mgr, world_seed):
    response = client_mgr.post(
        "/api/tasks/ad-hoc",
        json={
            "branch_id": world_seed["branch_id"],
            "title": "ארוכה מדי",
            "due_at": due_at_iso(),
            "assignee_user_id": world_seed["employee_id"],
            "photo_required": False,
            "duration_minutes": 999,
        },
    )
    assert response.status_code == 400, response.text
    assert "480" in response.json()["error"]


def test_occurrence_update_changes_keeps_and_clears_duration(client_mgr, world_seed):
    occ = _create_ad_hoc(client_mgr, world_seed, duration_minutes=15)

    changed = _update_occurrence(client_mgr, occ, duration_minutes=30)
    assert changed.status_code == 200, changed.text
    assert _get_occurrence(client_mgr, occ["id"])["duration_minutes"] == 30

    untouched = _update_occurrence(client_mgr, occ, title="כותרת חדשה")
    assert untouched.status_code == 200, untouched.text
    assert _get_occurrence(client_mgr, occ["id"])["duration_minutes"] == 30

    cleared = _update_occurrence(client_mgr, occ, duration_minutes=None)
    assert cleared.status_code == 200, cleared.text
    assert _get_occurrence(client_mgr, occ["id"])["duration_minutes"] is None


def test_occurrence_update_rejects_invalid_duration(client_mgr, world_seed):
    occ = _create_ad_hoc(client_mgr, world_seed, duration_minutes=15)
    response = _update_occurrence(client_mgr, occ, duration_minutes="abc")
    assert response.status_code == 400, response.text
    assert _get_occurrence(client_mgr, occ["id"])["duration_minutes"] == 15


# --- tâche קבועה ------------------------------------------------------------


def _create_daily_template(client_mgr, world_seed, *, title: str, **extra) -> dict:
    response = client_mgr.post(
        "/api/tasks/templates",
        json={
            "branch_id": world_seed["branch_id"],
            "title": title,
            "recurrence": "daily",
            "due_time": "23:58",
            "assignee_user_id": world_seed["employee_id"],
            **extra,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["template"]


def test_template_duration_copied_to_today_occurrence(client_mgr, client_emp, world_seed):
    template = _create_daily_template(client_mgr, world_seed, title="ספירת קופה", duration_minutes=20)
    assert template["duration_minutes"] == 20
    assert _employee_card(client_emp, title="ספירת קופה")["duration_minutes"] == 20


def test_template_update_syncs_open_occurrence_duration(client_mgr, client_emp, world_seed):
    template = _create_daily_template(client_mgr, world_seed, title="סידור מדפים", duration_minutes=20)
    occ_id = _employee_card(client_emp, title="סידור מדפים")["id"]

    response = client_mgr.patch(
        f"/api/tasks/templates/{template['id']}",
        json={
            "title": "סידור מדפים",
            "due_time": "23:58",
            "assignee_user_id": world_seed["employee_id"],
            "is_active": True,
            "duration_minutes": 45,
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["template"]["duration_minutes"] == 45
    assert _get_occurrence(client_mgr, occ_id)["duration_minutes"] == 45
    assert _employee_card(client_emp, occurrence_id=occ_id)["duration_minutes"] == 45


def test_template_update_without_field_keeps_duration(client_mgr, world_seed):
    template = _create_daily_template(client_mgr, world_seed, title="ניקוי מקרר", duration_minutes=10)
    response = client_mgr.patch(
        f"/api/tasks/templates/{template['id']}",
        json={
            "title": "ניקוי מקרר — עדכון",
            "due_time": "23:58",
            "assignee_user_id": world_seed["employee_id"],
            "is_active": True,
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["template"]["duration_minutes"] == 10


# --- non-régression : le temps passé du dashboard menahel reste distinct ----


def test_manager_timeline_duration_is_time_spent_not_planned(client_mgr, world_seed):
    occ = _create_ad_hoc(client_mgr, world_seed, duration_minutes=15)
    response = client_mgr.get("/api/dashboard/manager")
    assert response.status_code == 200, response.text
    member = next(m for m in response.json()["team"] if m["user_id"] == world_seed["employee_id"])
    item = next(t for t in member["timeline"] if t.get("occurrence_id", t.get("id")) == occ["id"])
    # Tâche pas encore faite : aucun temps passé, même si 15 minutes sont prévues.
    assert item["duration_minutes"] is None
