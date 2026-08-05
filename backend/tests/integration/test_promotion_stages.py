"""Intégration API במות מבצעים (promotion stages)."""
from __future__ import annotations


def _create_department(client_mgr, world_seed, *, name: str = "מחלקת ניקיון") -> str:
    response = client_mgr.post(
        "/api/departments",
        json={"branch_id": world_seed["branch_id"], "name": name},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    return body["department"]["id"] if "department" in body else body["id"]


def test_create_list_and_analysis_promotion_stage(client_mgr, world_seed):
    dept_id = _create_department(client_mgr, world_seed)
    created = client_mgr.post(
        "/api/promotion-stages",
        json={
            "branch_id": world_seed["branch_id"],
            "department_id": dept_id,
            "name": "במה 01",
            "location_label": "כניסה ראשית",
            "assignee_user_id": world_seed["employee_id"],
            "lead_product_name": "שמפו",
            "stock_pct": 75,
            "signage_status": "ok",
        },
    )
    assert created.status_code == 201, created.text
    stage = created.json()["stage"]
    assert stage["name"] == "במה 01"
    assert stage["stock_pct"] == 75
    assert stage["assignee_user_id"] == world_seed["employee_id"]

    listed = client_mgr.get(
        "/api/promotion-stages",
        params={"branch_id": world_seed["branch_id"]},
    )
    assert listed.status_code == 200, listed.text
    assert any(s["id"] == stage["id"] for s in listed.json())

    analysis = client_mgr.get(
        "/api/promotion-stages/analysis",
        params={"branch_id": world_seed["branch_id"]},
    )
    assert analysis.status_code == 200, analysis.text
    row = next(s for s in analysis.json() if s["id"] == stage["id"])
    assert row["urgent"] is False
    assert row["refill_suggested"] is False


def test_update_stock_marks_urgent_below_30(client_mgr, world_seed):
    dept_id = _create_department(client_mgr, world_seed, name="קופות")
    created = client_mgr.post(
        "/api/promotion-stages",
        json={
            "branch_id": world_seed["branch_id"],
            "department_id": dept_id,
            "name": "במה 02",
            "location_label": "מעבר קופות",
            "assignee_user_id": world_seed["employee_id"],
            "lead_product_name": "קפה",
            "stock_pct": 80,
        },
    )
    assert created.status_code == 201, created.text
    stage_id = created.json()["stage"]["id"]

    updated = client_mgr.patch(
        f"/api/promotion-stages/{stage_id}/stock",
        json={"stock_pct": 20, "signage_status": "needs_update"},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["stage"]["stock_pct"] == 20
    assert updated.json()["stage"]["needs_refill"] is True

    analysis = client_mgr.get(
        "/api/promotion-stages/analysis",
        params={"branch_id": world_seed["branch_id"]},
    )
    assert analysis.status_code == 200
    row = next(s for s in analysis.json() if s["id"] == stage_id)
    assert row["urgent"] is True
    assert row["refill_suggested"] is True


def test_employee_cannot_create_promotion_stage(client_emp, world_seed):
    response = client_emp.post(
        "/api/promotion-stages",
        json={
            "branch_id": world_seed["branch_id"],
            "department_id": "00000000-0000-0000-0000-000000000001",
            "name": "אסור",
        },
    )
    assert response.status_code in {403, 400, 404}
