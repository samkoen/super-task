"""Tâche קבועה שבועית : un seul jour + שמע obligatoire doit être accepté."""
from __future__ import annotations


def _body(world, **over) -> dict:
    body = {
        "branch_id": world["branch_id"],
        "title": "שמע שבועי",
        "description": "",
        "recurrence": "weekly",
        "due_time": "18:00",
        "assignee_user_id": world["employee_id"],
        "weekly_days": "2",
        "completion_requirements": [{"kind": "audio"}],
    }
    body.update(over)
    return body


def test_weekly_one_day_with_required_audio_is_created(client_mgr, world_seed):
    created = client_mgr.post("/api/tasks/templates", json=_body(world_seed))
    assert created.status_code == 201, created.text
    template = created.json()["template"]
    assert template["recurrence"] == "weekly"
    assert template["weekly_days"] == "2"
    assert template["completion_requirements"] == [{"kind": "audio"}]


def test_weekly_monday_zero_with_required_audio_is_created(client_mgr, world_seed):
    created = client_mgr.post(
        "/api/tasks/templates",
        json=_body(world_seed, title="יום שני", weekly_days="0"),
    )
    assert created.status_code == 201, created.text
    assert created.json()["template"]["weekly_days"] == "0"


def test_weekly_monday_number_with_required_audio_is_created(client_mgr, world_seed):
    created = client_mgr.post(
        "/api/tasks/templates",
        json=_body(world_seed, title="אפס", weekly_days=0),
    )
    assert created.status_code == 201, created.text
    assert created.json()["template"]["weekly_days"] == "0"
    assert created.json()["template"]["completion_requirements"] == [{"kind": "audio"}]


def test_weekly_one_day_list_with_required_audio_is_created(client_mgr, world_seed):
    created = client_mgr.post(
        "/api/tasks/templates",
        json=_body(world_seed, title="רשימה", weekly_days=["3"]),
    )
    assert created.status_code == 201, created.text
    assert created.json()["template"]["weekly_days"] == "3"


def test_weekly_today_with_required_audio_creates_occurrence(client_mgr, world_seed):
    created = client_mgr.post(
        "/api/tasks/templates",
        json=_body(world_seed, title="היום", weekly_days="6"),
    )
    assert created.status_code == 201, created.text
    template_id = created.json()["template"]["id"]
    rows = client_mgr.get("/api/tasks/occurrences").json()
    occ = next(r for r in rows if r.get("template_id") == template_id)
    assert occ["completion_requirements"] == [{"kind": "audio"}]
