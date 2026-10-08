"""Intégration : תעודות Agroline de la synchro à la réponse de l'oved.

Agroline est toujours simulé : le client réseau est remplacé et `fetch_documents`
renvoie des documents fixes. Aucun appel HTTP réel n'est possible dans ce fichier.
"""
from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

import pytest

from app.integrations.agroline.client import AgrolineError
from tests.integration.conftest import EMP_B_EMAIL, login_client

TODAY = datetime.now(ZoneInfo("Asia/Jerusalem")).date().isoformat()
PDF_BYTES = b"%PDF-1.4 teuda de test"


def _document(number: str = "2315109", customer: str = "Branch A", *, with_pdf: bool = True) -> dict:
    return {
        "agroline_number": number,
        "customer_name": customer,
        "document_date": TODAY,
        "kind": "fresh",
        "_with_pdf": with_pdf,
        "lines": [
            {"product_name": "עגבניות", "quantity": 12, "unit": "ק״ג", "origin_name": "ישראל"},
            {"product_name": "תפוח", "quantity": 3, "unit": "קרטון", "origin_name": "איטליה"},
        ],
    }


class _FakeAgroline:
    """Remplace AgrolineClient + fetch_documents : mémorise les appels, jamais de réseau."""

    def __init__(self) -> None:
        self.documents: list[dict] = []
        self.error: str | None = None
        self.calls: list[dict] = []

    def fetch(self, client, *, username, password, internal, day, store_pdf):
        self.calls.append({"username": username, "password": password, "internal": internal})
        if self.error:
            raise AgrolineError(self.error)
        documents = []
        for raw in self.documents:
            document = {key: value for key, value in raw.items() if key != "_with_pdf"}
            if raw.get("_with_pdf"):
                document["pdf_url"] = store_pdf(PDF_BYTES)
            documents.append(document)
        return documents, []


class _NoNetworkClient:
    def close(self) -> None:
        return None

    def __getattr__(self, name):
        raise AssertionError(f"appel réseau Agroline interdit dans les tests ({name})")


@pytest.fixture()
def agroline(monkeypatch):
    fake = _FakeAgroline()
    monkeypatch.setattr("app.controllers.delivery_note_controller.AgrolineClient", _NoNetworkClient)
    monkeypatch.setattr("app.controllers.delivery_note_controller.fetch_documents", fake.fetch)
    return fake


@pytest.fixture()
def client_emp_b(app, second_branch_seed):
    return login_client(app, EMP_B_EMAIL)


def _save_account(client, **over):
    body = {"enabled": True, "username": "yitz", "password": "pw-agroline", "internal": False}
    body.update(over)
    return client.post("/api/delivery-notes/account", json=body)


def _open_template(client_mgr, world, task_type: str = "line_check") -> str:
    created = client_mgr.post(
        "/api/tasks/templates",
        json={
            "branch_id": world["branch_id"],
            "title": "בדיקת קבלה",
            "description": "בדקו את הסחורה",
            "recurrence": "daily",
            "due_time": "18:00",
            "assignee_user_id": world["employee_id"],
            "opened_by_delivery_note": True,
            "delivery_note_task_type": task_type,
        },
    )
    assert created.status_code == 201, created.text
    return created.json()["template"]["id"]


def _sync(client, agroline, *documents):
    agroline.documents = list(documents)
    response = client.post("/api/delivery-notes/sync", json={})
    assert response.status_code == 200, response.text
    return response.json()


def _opened_ids(outcome: dict) -> list[str]:
    return [occ for item in outcome["results"] for occ in item["opened_occurrence_ids"]]


def test_sync_opens_the_task_and_the_oved_answers_the_lines(
    client_mgr, client_emp, world_seed, agroline
):
    assert _save_account(client_mgr).status_code == 200
    _open_template(client_mgr, world_seed)

    outcome = _sync(client_mgr, agroline, _document())
    assert outcome["errors"] == []
    (occurrence_id,) = _opened_ids(outcome)
    assert agroline.calls == [{"username": "yitz", "password": "pw-agroline", "internal": False}]

    check = client_emp.get(f"/api/delivery-notes/occurrences/{occurrence_id}")
    assert check.status_code == 200, check.text
    body = check.json()
    assert body["agroline_number"] == "2315109"
    assert body["task_type"] == "line_check"
    assert [line["product_name"] for line in body["lines"]] == ["עגבניות", "תפוח"]

    answers = {
        "lines": [
            {"line_id": body["lines"][0]["id"], "arrival": "ok"},
            {"line_id": body["lines"][1]["id"], "arrival": "problem", "note": "רקוב"},
        ]
    }
    saved = client_emp.post(f"/api/delivery-notes/occurrences/{occurrence_id}/answers", json=answers)
    assert saved.status_code == 200, saved.text
    assert saved.json()["overall_status"] == "problem"

    reread = client_emp.get(f"/api/delivery-notes/occurrences/{occurrence_id}").json()
    assert [line["answer"]["arrival"] for line in reread["lines"]] == ["ok", "problem"]
    assert reread["lines"][1]["answer"]["note"] == "רקוב"
    assert reread["suggested_overall"] == "problem"


def test_all_lines_ok_suggests_acceptance(client_mgr, client_emp, world_seed, agroline):
    _save_account(client_mgr)
    _open_template(client_mgr, world_seed)
    (occurrence_id,) = _opened_ids(_sync(client_mgr, agroline, _document()))
    lines = client_emp.get(f"/api/delivery-notes/occurrences/{occurrence_id}").json()["lines"]
    answers = {"lines": [{"line_id": line["id"], "arrival": "ok"} for line in lines]}
    saved = client_emp.post(f"/api/delivery-notes/occurrences/{occurrence_id}/answers", json=answers)
    assert saved.json()["overall_status"] == "accepted"


def test_a_problem_line_without_a_note_is_refused(client_mgr, client_emp, world_seed, agroline):
    _save_account(client_mgr)
    _open_template(client_mgr, world_seed)
    (occurrence_id,) = _opened_ids(_sync(client_mgr, agroline, _document()))
    lines = client_emp.get(f"/api/delivery-notes/occurrences/{occurrence_id}").json()["lines"]
    answers = {
        "lines": [
            {"line_id": lines[0]["id"], "arrival": "problem"},
            {"line_id": lines[1]["id"], "arrival": "ok"},
        ]
    }
    refused = client_emp.post(f"/api/delivery-notes/occurrences/{occurrence_id}/answers", json=answers)
    assert refused.status_code == 400
    again = client_emp.get(f"/api/delivery-notes/occurrences/{occurrence_id}").json()
    assert all(line["answer"] is None for line in again["lines"])


def test_a_second_sync_does_not_open_the_task_twice(client_mgr, world_seed, agroline):
    _save_account(client_mgr)
    _open_template(client_mgr, world_seed)
    assert len(_opened_ids(_sync(client_mgr, agroline, _document()))) == 1
    assert _opened_ids(_sync(client_mgr, agroline, _document())) == []


def test_origin_task_lists_only_products_with_a_country(client_mgr, client_emp, world_seed, agroline):
    _save_account(client_mgr)
    _open_template(client_mgr, world_seed, task_type="origin_list")
    document = _document()
    document["lines"][1]["origin_name"] = None
    (occurrence_id,) = _opened_ids(_sync(client_mgr, agroline, document))
    body = client_emp.get(f"/api/delivery-notes/occurrences/{occurrence_id}").json()
    assert body["task_type"] == "origin_list"
    assert [line["product_name"] for line in body["lines"]] == ["עגבניות"]
    lines = body["lines"]
    refused = client_emp.post(
        f"/api/delivery-notes/occurrences/{occurrence_id}/answers",
        json={"lines": [{"line_id": lines[0]["id"], "arrival": "ok"}]},
    )
    assert refused.status_code == 400


def test_an_oved_of_another_snif_cannot_read_or_answer(
    client_mgr, world_seed, second_branch_seed, client_emp_b, agroline
):
    _save_account(client_mgr)
    _open_template(client_mgr, world_seed)
    (occurrence_id,) = _opened_ids(_sync(client_mgr, agroline, _document()))
    url = f"/api/delivery-notes/occurrences/{occurrence_id}"
    assert client_emp_b.get(url).status_code == 403
    assert client_emp_b.post(f"{url}/answers", json={"lines": []}).status_code == 403


def test_a_task_without_teuda_answers_404(client_emp, chat_seed):
    missing = client_emp.get(f"/api/delivery-notes/occurrences/{chat_seed['occurrence_id']}")
    assert missing.status_code == 404


def test_the_oved_manages_the_agroline_login_without_exposing_the_password(
    client_mgr, client_emp, agroline
):
    assert client_emp.get("/api/delivery-notes/account").json()["configured"] is False
    saved = _save_account(client_emp)
    assert saved.status_code == 200, saved.text
    assert saved.json() == {"enabled": True, "configured": True, "username": "yitz", "internal": False}
    seen_by_manager = client_mgr.get("/api/delivery-notes/account")
    assert seen_by_manager.json()["username"] == "yitz"
    assert "pw-agroline" not in seen_by_manager.text
    kept = _save_account(client_mgr, password="", username="yitz2")
    assert kept.json()["username"] == "yitz2"
    _sync(client_mgr, agroline)
    assert agroline.calls[-1]["password"] == "pw-agroline"


def test_a_login_cannot_be_saved_without_a_password_the_first_time(client_mgr):
    refused = _save_account(client_mgr, password="")
    assert refused.status_code == 400


def test_sync_stops_when_agroline_access_is_off(client_mgr, world_seed, agroline):
    _save_account(client_mgr)
    assert _save_account(client_mgr, enabled=False).json()["enabled"] is False
    refused = client_mgr.post("/api/delivery-notes/sync", json={})
    assert refused.status_code == 400
    assert agroline.calls == []


def test_an_agroline_failure_is_reported_to_the_user(client_mgr, agroline):
    _save_account(client_mgr)
    agroline.error = "שם משתמש או סיסמה שגויים"
    failed = client_mgr.post("/api/delivery-notes/sync", json={})
    assert failed.status_code == 400
    assert "שגויים" in failed.text


def test_an_oved_sync_opens_tasks_only_for_his_own_snif(
    client_mgr, client_emp, world_seed, second_branch_seed, agroline
):
    _save_account(client_mgr)
    _open_template(client_mgr, world_seed)
    outcome = _sync(
        client_emp, agroline, _document("111"), _document("222", customer="Branch B")
    )
    assert [item["agroline_number"] for item in outcome["results"]] == ["111"]
    assert [item["agroline_number"] for item in outcome["errors"]] == ["222"]
    assert len(_opened_ids(outcome)) == 1


def test_an_oved_cannot_push_documents_or_change_the_task_setting(
    client_emp, client_mgr, world_seed, agroline
):
    pushed = client_emp.post("/api/delivery-notes/ingest", json=_document())
    assert pushed.status_code == 403
    template_id = _open_template(client_mgr, world_seed)
    marked = client_emp.post(
        f"/api/delivery-notes/templates/{template_id}", json={"opened": False}
    )
    assert marked.status_code == 403


def test_the_pdf_is_served_through_the_proxy_to_the_right_snif_only(
    client_mgr, client_emp, world_seed, second_branch_seed, client_emp_b, agroline
):
    _save_account(client_mgr)
    _open_template(client_mgr, world_seed)
    _sync(client_mgr, agroline, _document())
    (note,) = client_emp.get("/api/delivery-notes/inbox").json()
    pdf_url = note["pdf_url"]
    assert pdf_url.endswith(".pdf")

    allowed = client_emp.get("/api/media/proxy", params={"src": pdf_url})
    assert allowed.status_code == 200
    assert allowed.content == PDF_BYTES
    assert client_emp_b.get("/api/media/proxy", params={"src": pdf_url}).status_code == 403


def test_an_unlinked_teuda_stays_in_the_inbox_and_its_pdf_is_readable(
    client_mgr, client_emp, world_seed, agroline
):
    _save_account(client_mgr)
    _open_template(client_mgr, world_seed)
    outcome = _sync(client_mgr, agroline, _document("999", customer="לקוח לא מוכר"))
    assert _opened_ids(outcome) == []
    (note,) = client_emp.get("/api/delivery-notes/inbox").json()
    assert note["agroline_number"] == "999"
    assert note["branch_id"] is None
    assert client_emp.get("/api/media/proxy", params={"src": note["pdf_url"]}).status_code == 200


def test_linking_the_customer_opens_the_saved_teuda(client_mgr, client_emp, world_seed, agroline):
    _save_account(client_mgr)
    _open_template(client_mgr, world_seed)
    _sync(client_mgr, agroline, _document("999", customer="לקוח לא מוכר"))
    linked = client_mgr.post(
        "/api/delivery-notes/links",
        json={"customer_name": "לקוח לא מוכר", "branch_id": world_seed["branch_id"]},
    )
    assert linked.status_code == 200, linked.text
    (occurrence_id,) = linked.json()["opened_occurrence_ids"]
    assert client_emp.get(f"/api/delivery-notes/occurrences/{occurrence_id}").status_code == 200
