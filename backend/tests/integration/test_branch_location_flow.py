"""Intégration : le menahel pose le centre du snif, l'oved le reçoit pour la revue vidéo."""
from __future__ import annotations

from tests.integration.test_slot_submit_flow import _started, _submit, _video

LAT = 32.085313
LNG = 34.7818


def _patch(client, branch_id: str, **over):
    body = {"name": "Branch A", "address": "", "city": "", "postal_code": "", "is_active": True}
    body.update(over)
    return client.patch(f"/api/branches/{branch_id}", json=body)


def _center(client) -> dict | None:
    response = client.get("/api/dashboard/employee")
    assert response.status_code == 200, response.text
    return response.json()["employee"]["branch_location"]


def _saved(client, branch_id: str) -> dict:
    listed = client.get("/api/branches")
    assert listed.status_code == 200, listed.text
    return next(item for item in listed.json() if item["id"] == branch_id)


def test_employee_sees_the_branch_center_once_the_manager_sets_it(client_mgr, client_emp, world_seed):
    branch_id = world_seed["branch_id"]
    assert _center(client_emp) is None

    saved = _patch(client_mgr, branch_id, latitude=LAT, longitude=LNG)
    assert saved.status_code == 200, saved.text
    assert saved.json()["branch"]["latitude"] == LAT
    assert saved.json()["branch"]["longitude"] == LNG
    assert _saved(client_mgr, branch_id)["latitude"] == LAT
    assert _center(client_emp) == {"lat": LAT, "lng": LNG}


def test_renaming_the_branch_keeps_its_coordinates(client_mgr, client_emp, world_seed):
    branch_id = world_seed["branch_id"]
    assert _patch(client_mgr, branch_id, latitude=LAT, longitude=LNG).status_code == 200

    renamed = _patch(client_mgr, branch_id, name="סניף מרכז")
    assert renamed.status_code == 200, renamed.text
    assert renamed.json()["branch"]["name"] == "סניף מרכז"
    assert renamed.json()["branch"]["latitude"] == LAT
    assert _center(client_emp) == {"lat": LAT, "lng": LNG}


def test_half_or_invalid_coordinates_are_refused(client_mgr, world_seed):
    branch_id = world_seed["branch_id"]
    assert _patch(client_mgr, branch_id, latitude=LAT, longitude=LNG).status_code == 200

    only_lat = _patch(client_mgr, branch_id, latitude=LAT, longitude=None)
    out_of_range = _patch(client_mgr, branch_id, latitude=91, longitude=LNG)
    assert only_lat.status_code == 400, only_lat.text
    assert out_of_range.status_code == 400, out_of_range.text
    assert _saved(client_mgr, branch_id)["latitude"] == LAT
    assert _saved(client_mgr, branch_id)["longitude"] == LNG


def test_clearing_both_coordinates_hides_the_branch_center(client_mgr, client_emp, world_seed):
    branch_id = world_seed["branch_id"]
    assert _patch(client_mgr, branch_id, latitude=LAT, longitude=LNG).status_code == 200

    cleared = _patch(client_mgr, branch_id, latitude=None, longitude=None)
    assert cleared.status_code == 200, cleared.text
    assert cleared.json()["branch"]["latitude"] is None
    assert _center(client_emp) is None


def test_employee_cannot_set_the_branch_center(client_emp, world_seed):
    response = _patch(client_emp, world_seed["branch_id"], latitude=LAT, longitude=LNG)
    assert response.status_code == 403, response.text
    assert _center(client_emp) is None


def test_filmed_place_is_kept_on_the_sent_video(client_mgr, client_emp, world_seed):
    occ_id = _started(client_mgr, client_emp, world_seed)
    video = _video(client_emp)
    video["location"] = {"lat": 32.0853127, "lng": LNG, "accuracy": 18.24}

    sent = _submit(client_emp, occ_id, 1, video)
    assert sent.status_code == 200, sent.text
    saved = sent.json()["occurrence"]["completion"]["completion_attachments"][1]
    assert saved["location"] == {"lat": LAT, "lng": LNG, "accuracy": 18.2}


def test_bad_filmed_place_is_dropped_and_the_slot_still_sends(client_mgr, client_emp, world_seed):
    occ_id = _started(client_mgr, client_emp, world_seed)
    video = _video(client_emp)
    video["location"] = {"lat": 200, "lng": 0}

    sent = _submit(client_emp, occ_id, 1, video)
    assert sent.status_code == 200, sent.text
    saved = sent.json()["occurrence"]["completion"]["completion_attachments"][1]
    assert saved["url"] == video["url"]
    assert "location" not in saved
