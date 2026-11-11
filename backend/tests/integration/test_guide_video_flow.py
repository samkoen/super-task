"""Intégration : la vidéo guide du menahel arrive sur la carte de l'oved, pas sur un audio."""
from __future__ import annotations

from tests.integration.conftest import due_at_iso
from tests.integration.test_slot_review_flow import _find_card

GUIDE = "/uploads/task_videos/how.mp4"


def test_guide_video_reaches_the_employee_card(client_mgr, client_emp, world_seed):
    created = client_mgr.post(
        "/api/tasks/ad-hoc",
        json={
            "branch_id": world_seed["branch_id"],
            "title": "ספירה עם סרטון",
            "description": "לצלם",
            "due_at": due_at_iso(),
            "assignee_user_id": world_seed["employee_id"],
            "photo_required": False,
            "completion_requirements": [
                {"kind": "video", "min_seconds": 10, "title": "גיבוי", "guide_video_url": f" {GUIDE} "},
                {"kind": "audio", "title": "הסבר", "guide_video_url": "/uploads/task_videos/no.mp4"},
            ],
        },
    )
    assert created.status_code == 201, created.text
    occurrence = created.json()["occurrence"]
    stored = occurrence["completion_requirements"]
    assert stored[0]["guide_video_url"] == GUIDE
    assert "guide_video_url" not in stored[1]

    dashboard = client_emp.get("/api/dashboard/employee")
    assert dashboard.status_code == 200, dashboard.text
    card = _find_card(dashboard.json(), occurrence["id"])
    assert card["completion_requirements"][0]["guide_video_url"] == GUIDE
    assert "guide_video_url" not in card["completion_requirements"][1]
