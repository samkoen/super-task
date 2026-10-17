from types import SimpleNamespace

import pytest

from app.domain.scope import ActorContext
from app.models.task_template import TaskTemplate
from app.services.delivery_note_service import DeliveryNoteService


def _actor(role="branch_manager", branch_id="snif-1", user_id="mgr"):
    return ActorContext(user_id=user_id, role=role, branch_id=branch_id)


def _template(template_id, title="בדיקת קבלה"):
    return TaskTemplate(
        id=template_id,
        branch_id="snif-1",
        title=title,
        description="בדקו את הסחורה",
        recurrence="daily",
        due_time="18:00",
        weekly_days=None,
        monthly_day=None,
        assignee_user_id="oved-1",
        department_id=None,
        task_kind="fixed",
        photo_required=False,
        reference_photo_url=None,
        reference_video_url=None,
        reference_audio_url=None,
        biweekly_anchor=None,
        is_active=True,
        created_by_id="mgr",
        created_at="2026-10-01T00:00:00+00:00",
        updated_at="2026-10-01T00:00:00+00:00",
        opened_by_delivery_note=True,
    )


def _document(number="2315109"):
    return {
        "agroline_number": number,
        "customer_name": "שפע כנסת יחזקאל",
        "document_date": "2026-10-02",
        "kind": "fresh",
        "pdf_url": "https://files/2315109.pdf",
        "lines": [{"product_name": "עגבניות", "quantity": 12, "unit": "ק״ג"}],
    }


class FakeNotes:
    def __init__(self):
        self.links = {"שפע כנסת יחזקאל": "snif-1"}
        self.branch_names = {}
        self.notes = {}
        self.openings = []
        self.answers = []
        self.overall = {}

    def branch_id_for_customer(self, name):
        return self.links.get(name)

    def active_branch_names(self):
        return [(branch_id, branch_name) for branch_name, branch_id in self.branch_names.items()]

    def notes_without_branch(self):
        return [note for note in self.notes.values() if not note.get("branch_id")]

    def find_by_number(self, number):
        return self.notes.get(number)

    def insert_note(self, branch_id, document):
        note = {
            "id": f"note-{document['agroline_number']}",
            "branch_id": branch_id,
            "agroline_number": document["agroline_number"],
            "customer_name": document["customer_name"],
            "document_date": document["document_date"],
            "lines": [
                {"id": "line-1", "quantity": line["quantity"], **line}
                for line in document["lines"]
            ],
        }
        self.notes[document["agroline_number"]] = note
        return note

    def template_ids_for_note(self, note_id):
        return {row["template_id"] for row in self.openings if row["note_id"] == note_id}

    def link_opening(self, note_id, template_id, occurrence_id, task_type):
        opening_id = f"open-{occurrence_id}"
        self.openings.append(
            {
                "id": opening_id,
                "note_id": note_id,
                "template_id": template_id,
                "occurrence_id": occurrence_id,
                "task_type": task_type,
            }
        )
        return opening_id

    def opening_for_occurrence(self, occurrence_id):
        opening = next(row for row in self.openings if row["occurrence_id"] == occurrence_id)
        note = next(item for item in self.notes.values() if item["id"] == opening["note_id"])
        return {
            "id": opening["id"],
            "lines": note["lines"],
            "overall_status": self.overall.get(opening["id"]),
            "task_type": opening.get("task_type") or "line_check",
        }

    def save_answer(self, opening_id, line_id, answer):
        self.answers.append({"opening_id": opening_id, "line_id": line_id, **answer})

    def save_overall(self, opening_id, status):
        self.overall[opening_id] = status

    def list_inbox(self, document_date):
        return [note for note in self.notes.values() if note["document_date"] == document_date]

    def link_customer(self, name, branch_id):
        self.links[name] = branch_id
        return {"customer_name": name, "branch_id": branch_id}

    def notes_for_customer(self, name):
        return [note for note in self.notes.values() if note.get("customer_name") == name]

    def notes_for_branch(self, branch_id, document_date=None):
        rows = [note for note in self.notes.values() if note.get("branch_id") == branch_id]
        if document_date is None:
            return rows
        return [note for note in rows if note.get("document_date") == document_date]

    def refresh_line_origins(self, note_id, lines):
        note = next(item for item in self.notes.values() if item["id"] == note_id)
        incoming = {line["position"]: line for line in lines}
        for stored in note["lines"]:
            fresh = incoming.get(stored.get("position"))
            if fresh:
                stored["origin_name"] = fresh.get("origin_name")
                stored["weight"] = fresh.get("weight")
                stored["price"] = fresh.get("price")
                stored["image_url"] = fresh.get("image_url")
        return note

    def set_branch(self, note_id, branch_id):
        note = next(item for item in self.notes.values() if item["id"] == note_id)
        note["branch_id"] = branch_id
        return note


class FakeTemplates:
    def __init__(self, templates):
        self.templates = templates

    def list_templates(self, *, branch_id, active_only):
        return [item for item in self.templates if item.branch_id == branch_id and item.is_active]

    def find_by_id(self, template_id):
        return next((item for item in self.templates if item.id == template_id), None)

    def set_opened_by_delivery_note(self, template_id, opened, task_type=None):
        item = self.find_by_id(template_id)
        if item is None:
            return None
        item.opened_by_delivery_note = opened
        item.delivery_note_task_type = task_type
        return item


class FakeOccurrences:
    def __init__(self):
        self.created = []

    def create(self, **kwargs):
        occurrence = SimpleNamespace(id=f"occ-{len(self.created) + 1}", **kwargs)
        self.created.append(occurrence)
        return occurrence

    def find_by_id(self, occurrence_id):
        return next((item for item in self.created if item.id == occurrence_id), None)

    def exists_for_template_on_date(self, template_id, day):
        return False

    def delete_without_delivery_note(self, template_id):
        removed = [item.id for item in self.created if getattr(item, "from_teuda", False) is False and item.template_id == template_id]
        self.created = [item for item in self.created if item.id not in removed]
        return removed


def _service(templates):
    notes = FakeNotes()
    occurrences = FakeOccurrences()
    return DeliveryNoteService(notes, FakeTemplates(templates), occurrences), notes, occurrences


def test_two_models_open_two_occurrences_for_one_teuda():
    service, notes, occurrences = _service([_template("tpl-a"), _template("tpl-b", "צילום")])
    result = service.ingest(_actor(), _document())
    assert result["created"] is True
    assert len(result["opened_occurrence_ids"]) == 2
    assert [item.title for item in occurrences.created] == [
        "בדיקת קבלה 2315109",
        "צילום 2315109",
    ]
    assert notes.notes["2315109"]["id"]
    assert all(getattr(item, "reference_photo_url", None) is None for item in occurrences.created)


def test_resync_keeps_the_mark_under_the_product():
    service, notes, _ = _service([_template("tpl-a")])
    service.ingest(_actor(), _document())
    again = _document()
    again["lines"] = [{
        **again["lines"][0],
        "origin_name": "איטליה",
        "weight": 9.23,
        "price": 10.5,
        "image_url": "https://my.agroline.co.il/v1/images/products/194.png",
    }]
    service.ingest(_actor(), again)
    stored = notes.notes["2315109"]["lines"][0]
    assert stored["origin_name"] == "איטליה"
    assert stored["weight"] == 9.23
    assert stored["price"] == 10.5
    assert stored["image_url"].endswith("/194.png")


def test_same_teuda_does_not_open_twice():
    service, _, occurrences = _service([_template("tpl-a")])
    service.ingest(_actor(), _document())
    again = service.ingest(_actor(), _document())
    assert again["created"] is False
    assert again["opened_occurrence_ids"] == []
    assert len(occurrences.created) == 1


def test_unknown_customer_is_kept_without_a_task():
    service, notes, occurrences = _service([_template("tpl-a")])
    document = _document()
    document["customer_name"] = "לקוח לא מקושר"
    saved = service.ingest(_actor(), document)
    assert saved["opened_occurrence_ids"] == []
    assert notes.notes["2315109"]["branch_id"] is None
    assert occurrences.created == []


def test_employee_cannot_ingest():
    service, _, _ = _service([_template("tpl-a")])
    with pytest.raises(PermissionError):
        service.ingest(_actor(role="employee", user_id="oved-1"), _document())


def test_employee_can_read_the_account_and_save_the_login():
    accounts = _Accounts()
    service = DeliveryNoteService(SimpleNamespace(), SimpleNamespace(), SimpleNamespace(), accounts)
    oved = _actor(role="employee", user_id="oved-1")
    assert service.account_status(oved)["configured"] is False
    saved = service.save_account(oved, "yitz", "secret", False, True)
    assert saved["username"] == "yitz"
    assert service.account_status(oved)["configured"] is True


def test_employee_sync_opens_tasks_only_for_his_own_snif():
    service, notes, occurrences = _service([_template("tpl-a")])
    notes.links["לקוח אחר"] = "snif-2"
    oved = _actor(role="employee", user_id="oved-1", branch_id="snif-1")
    outcome = service.pull_documents(oved, [_document(), {**_document("999"), "customer_name": "לקוח אחר"}])
    assert [row["agroline_number"] for row in outcome["results"]] == ["2315109"]
    assert [row["agroline_number"] for row in outcome["errors"]] == ["999"]
    assert "999" not in notes.notes
    assert len(occurrences.created) == 1


def test_employee_can_list_the_inbox_but_not_ingest_directly():
    service, _, _ = _service([_template("tpl-a")])
    service.ingest(_actor(), _document())
    oved = _actor(role="employee", user_id="oved-1")
    assert len(service.list_inbox(oved, "2026-10-02")) == 1
    with pytest.raises(PermissionError):
        service.ingest(oved, _document("111"))
    with pytest.raises(PermissionError):
        service.link_customer(oved, "שפע", "snif-1")


def test_assignee_saves_a_problem_with_one_note():
    service, notes, _ = _service([_template("tpl-a")])
    opened = service.ingest(_actor(), _document())
    occurrence_id = opened["opened_occurrence_ids"][0]
    saved = service.submit_answers(
        _actor(role="employee", user_id="oved-1"),
        occurrence_id,
        {"lines": [{"line_id": "line-1", "arrival": "problem", "note": "רקוב"}]},
    )
    assert saved["suggested_overall"] == "problem"
    assert saved["overall_status"] == "problem"
    answer = notes.answers[0]
    assert answer["arrival"] == "problem"
    assert answer["note"] == "רקוב"
    assert answer["photo_url"] is None
    assert answer["audio_url"] is None


def test_other_employee_cannot_answer():
    service, _, _ = _service([_template("tpl-a")])
    opened = service.ingest(_actor(), _document())
    with pytest.raises(PermissionError):
        service.submit_answers(
            _actor(role="employee", user_id="someone-else"),
            opened["opened_occurrence_ids"][0],
            {"lines": [{"line_id": "line-1", "arrival": "ok"}]},
        )


def test_overall_follows_the_lines():
    service, _, _ = _service([_template("tpl-a")])
    opened = service.ingest(_actor(), _document())
    saved = service.submit_answers(
        _actor(role="employee", user_id="oved-1"),
        opened["opened_occurrence_ids"][0],
        {"overall_status": "problem", "lines": [{"line_id": "line-1", "arrival": "ok"}]},
    )
    assert saved["suggested_overall"] == "accepted"
    assert saved["overall_status"] == "accepted"


def test_unlinked_customer_stays_visible_without_a_task():
    service, notes, occurrences = _service([_template("tpl-a")])
    outcome = service.pull_documents(
        _actor(role="network_manager", branch_id=None),
        [_document(), {**_document("999"), "customer_name": "לא מקושר"}],
    )
    assert outcome["errors"] == []
    assert notes.notes["999"]["branch_id"] is None
    assert len(occurrences.created) == 1
    visible = service.list_inbox(_actor(), "2026-10-02")
    assert {row["agroline_number"] for row in visible} == {"2315109", "999"}


def test_linking_the_snif_gives_the_task_to_its_dedicated_oved():
    other = _template("tpl-b", "צילום")
    other.branch_id = "snif-2"
    other.assignee_user_id = "oved-2"
    service, _, occurrences = _service([_template("tpl-a"), other])
    document = _document()
    document["customer_name"] = "לקוח חדש"
    service.ingest(_actor(), document)
    saved = service.link_customer(_actor(), "לקוח חדש", "snif-1")
    assert saved["opened_occurrence_ids"] == ["occ-1"]
    assert occurrences.created[0].assignee_user_id == "oved-1"
    assert occurrences.created[0].branch_id == "snif-1"


class _Accounts:
    def __init__(self):
        self.row = None

    def get(self):
        return self.row

    def save(self, username, password_encrypted, is_internal, enabled):
        self.row = {
            "username": username,
            "password_encrypted": password_encrypted,
            "is_internal": is_internal,
            "enabled": enabled,
        }
        return self.row

    def set_enabled(self, enabled):
        if self.row is None:
            return None
        self.row = {**self.row, "enabled": enabled}
        return self.row


def test_agroline_access_off_keeps_the_login_but_blocks_sync():
    accounts = _Accounts()
    accounts.row = {
        "username": "yitz",
        "password_encrypted": "enc",
        "is_internal": True,
        "enabled": True,
    }
    service = DeliveryNoteService(SimpleNamespace(), SimpleNamespace(), SimpleNamespace(), accounts)
    saved = service.save_account(_actor(), "", "", False, False)
    assert saved["enabled"] is False
    assert saved["username"] == "yitz"
    assert accounts.row["password_encrypted"] == "enc"
    with pytest.raises(ValueError, match="גישה"):
        service.credentials()


def test_agroline_access_on_requires_a_username():
    service = DeliveryNoteService(SimpleNamespace(), SimpleNamespace(), SimpleNamespace(), _Accounts())
    with pytest.raises(ValueError, match="שם משתמש"):
        service.save_account(_actor(), "  ", "secret", False, True)


def test_marking_the_model_sets_the_line_check_type():
    template = _template("tpl-a")
    template.opened_by_delivery_note = False
    service, notes, _ = _service([template])
    saved = service.mark_opened_by_delivery_note(_actor(), "tpl-a", True)
    assert saved["delivery_note_task_type"] == "line_check"
    service.ingest(_actor(), _document())
    assert notes.openings[0]["task_type"] == "line_check"
    cleared = service.mark_opened_by_delivery_note(_actor(), "tpl-a", False)
    assert cleared["delivery_note_task_type"] is None
    assert notes.openings[0]["task_type"] == "line_check"


def test_marking_the_model_can_list_products_with_an_origin():
    template = _template("tpl-a")
    template.opened_by_delivery_note = False
    service, notes, _ = _service([template])
    saved = service.mark_opened_by_delivery_note(_actor(), "tpl-a", True, "origin_list")
    assert saved["delivery_note_task_type"] == "origin_list"
    service.ingest(_actor(), _document())
    assert notes.openings[0]["task_type"] == "origin_list"


def test_unknown_teuda_task_type_is_rejected():
    service, _, _ = _service([_template("tpl-a")])
    with pytest.raises(ValueError, match="סוג"):
        service.mark_opened_by_delivery_note(_actor(), "tpl-a", True, "photo")


def test_origin_list_does_not_accept_line_answers():
    service, notes, _ = _service([_template("tpl-a")])
    opened = service.ingest(_actor(), _document())
    notes.openings[0]["task_type"] = "origin_list"
    with pytest.raises(ValueError, match="בדיקת שורות"):
        service.submit_answers(
            _actor(role="employee", user_id="oved-1"),
            opened["opened_occurrence_ids"][0],
            {"lines": [{"line_id": "line-1", "arrival": "ok"}]},
        )


def test_line_answers_stay_on_the_line_check_type():
    service, notes, _ = _service([_template("tpl-a")])
    opened = service.ingest(_actor(), _document())
    notes.openings[0]["task_type"] = "photo"
    with pytest.raises(ValueError, match="בדיקת שורות"):
        service.submit_answers(
            _actor(role="employee", user_id="oved-1"),
            opened["opened_occurrence_ids"][0],
            {"lines": [{"line_id": "line-1", "arrival": "ok"}]},
        )


def test_marking_the_model_opens_only_todays_teudot(monkeypatch):
    monkeypatch.setattr("app.services.delivery_note_service._israel_today", lambda: "2026-10-08")
    template = _template("tpl-a")
    template.opened_by_delivery_note = False
    service, notes, occurrences = _service([template])
    notes.notes["old"] = _stored_note("2317000", "2026-10-01")
    notes.notes["today"] = _stored_note("2318018", "2026-10-08")
    service.mark_opened_by_delivery_note(_actor(), "tpl-a", True)
    assert len(occurrences.created) == 1
    assert "2318018" in occurrences.created[0].title


def _stored_note(number: str, document_date: str) -> dict:
    return {
        "id": f"note-{number}",
        "branch_id": "snif-1",
        "agroline_number": number,
        "customer_name": "יד השם",
        "document_date": document_date,
        "lines": [{"id": "line-1", "quantity": 1, "product_name": "תפוח נאשי", "unit": "קרטון"}],
    }


def test_marking_the_model_drops_the_task_opened_without_a_teuda():
    template = _template("tpl-a")
    template.opened_by_delivery_note = False
    service, _, occurrences = _service([template])
    occurrences.created.append(SimpleNamespace(id="calendar", template_id="tpl-a", from_teuda=False))
    service.mark_opened_by_delivery_note(_actor(), "tpl-a", True)
    assert [item.id for item in occurrences.created] == []


def test_contained_snif_name_opens_the_saved_teuda():
    service, notes, occurrences = _service([_template("tpl-a")])
    document = _document()
    document["customer_name"] = "יד השם"
    service.ingest(_actor(), document)
    assert notes.notes["2315109"]["branch_id"] is None
    notes.branch_names["יד השם ביתר"] = "snif-1"
    opened = service.open_pending(_actor(role="admin", branch_id=None))
    assert opened == ["occ-1"]
    assert notes.notes["2315109"]["branch_id"] == "snif-1"
    assert occurrences.created[0].branch_id == "snif-1"


def test_two_contained_snif_names_leave_the_teuda_unlinked():
    service, notes, occurrences = _service([_template("tpl-a")])
    document = _document()
    document["customer_name"] = "יד השם"
    notes.branch_names["יד השם ביתר"] = "snif-1"
    notes.branch_names["יד השם ירושלים"] = "snif-2"
    service.ingest(_actor(role="admin", branch_id=None), document)
    assert notes.notes["2315109"]["branch_id"] is None
    assert occurrences.created == []
    assert service.open_pending(_actor(role="admin", branch_id=None)) == []


def test_explicit_link_wins_over_a_contained_snif_name():
    service, notes, occurrences = _service([_template("tpl-a")])
    notes.links["יד השם"] = "snif-1"
    notes.branch_names["יד השם ביתר"] = "snif-2"
    document = _document()
    document["customer_name"] = "יד השם"
    saved = service.ingest(_actor(), document)
    assert notes.notes["2315109"]["branch_id"] == "snif-1"
    assert saved["opened_occurrence_ids"] == ["occ-1"]
    assert occurrences.created[0].branch_id == "snif-1"


def test_same_snif_name_opens_the_saved_teuda_for_its_oved():
    service, notes, occurrences = _service([_template("tpl-a")])
    document = _document()
    document["customer_name"] = "שפע הרב שך"
    service.ingest(_actor(), document)
    assert occurrences.created == []
    notes.branch_names["שפע הרב שך"] = "snif-1"
    opened = service.open_pending(_actor(role="admin", branch_id=None))
    assert opened == ["occ-1"]
    assert occurrences.created[0].assignee_user_id == "oved-1"
    assert occurrences.created[0].branch_id == "snif-1"


def test_order_task_stays_on_the_calendar_and_does_not_open_with_a_teuda():
    template = _template("tpl-a")
    template.opened_by_delivery_note = False
    service, notes, occurrences = _service([template])
    occurrences.created.append(SimpleNamespace(id="calendar", template_id="tpl-a", from_teuda=False))
    service.mark_opened_by_delivery_note(_actor(), "tpl-a", True, "order_read")
    assert any(item.id == "calendar" for item in occurrences.created)
    service.ingest(_actor(), _document())
    assert notes.openings == []


def test_employee_sees_his_snif_orders_and_the_manager_sees_all():
    template = _template("tpl-a")
    template.delivery_note_task_type = "order_read"
    service, _, occurrences = _service([template])
    service._orders = _FakeOrders()
    occurrences.created.append(_order_occurrence())
    documents = [_order("1", "שפע כנסת יחזקאל"), _order("2", "לקוח בלי סניף")]
    employee = _actor(role="employee", user_id="oved-1")
    shown = service.store_orders(employee, "occ-order", documents)
    assert [item["agroline_number"] for item in shown["orders"]] == ["1"]
    everyone = service.store_orders(_actor(), "occ-order", documents)
    assert {item["agroline_number"] for item in everyone["orders"]} == {"1", "2"}
    assert service.orders_view(employee, "occ-order")["orders"][0]["pdf_url"] == "https://files/1.pdf"
    with pytest.raises(PermissionError):
        service.orders_view(_actor(role="employee", user_id="other"), "occ-order")


def test_a_line_check_task_has_no_order_list():
    template = _template("tpl-a")
    template.delivery_note_task_type = "line_check"
    service, _, occurrences = _service([template])
    occurrences.created.append(_order_occurrence())
    employee = _actor(role="employee", user_id="oved-1")
    assert service.orders_view(employee, "occ-order") is None
    with pytest.raises(ValueError, match="קריאת הזמנות"):
        service.order_day(employee, "occ-order")


def test_a_reread_keeps_two_versions_only_when_the_order_changes():
    template = _template("tpl-a")
    template.delivery_note_task_type = "order_read"
    service, _, occurrences = _service([template])
    orders = _FakeOrders()
    service._orders = orders
    occurrences.created.append(_order_occurrence())
    employee = _actor(role="employee", user_id="oved-1")
    service.store_orders(employee, "occ-order", [_order("1", "שפע כנסת יחזקאל", sha="aaa")])
    first_at = orders.versions("1")[0]["read_at"]
    service.store_orders(employee, "occ-order", [_order("1", "שפע כנסת יחזקאל", sha="aaa")])
    assert [row["reading_kind"] for row in orders.versions("1")] == ["first"]
    assert orders.versions("1")[0]["read_at"] == first_at
    shown = service.store_orders(employee, "occ-order", [_order("1", "שפע כנסת יחזקאל", sha="bbb")])
    kinds = {row["reading_kind"]: row for row in orders.versions("1")}
    assert set(kinds) == {"first", "latest"}
    assert kinds["first"]["pdf_sha256"] == "aaa"
    assert kinds["first"]["read_at"] == first_at
    assert kinds["latest"]["pdf_sha256"] == "bbb"
    assert kinds["latest"]["read_at"]
    assert shown["orders"][0]["pdf_url"] == "https://files/1.pdf"
    latest_at = kinds["latest"]["read_at"]
    service.store_orders(employee, "occ-order", [_order("1", "שפע כנסת יחזקאל", sha="bbb")])
    again = next(row for row in orders.versions("1") if row["reading_kind"] == "latest")
    assert again["read_at"] == latest_at
    assert len(orders.versions("1")) == 2


class _FakeOrders:
    def __init__(self):
        self.rows: list[dict] = []

    def versions(self, number):
        return [row for row in self.rows if row["agroline_number"] == number]

    def list_on(self, day):
        return [row for row in self.rows if row["document_date"] == day]

    def save_reading(self, kind, branch_id, document, read_at):
        row = {key: value for key, value in document.items() if key != "pdf_bytes"}
        row.update(branch_id=branch_id, reading_kind=kind, read_at=read_at.isoformat())
        self.rows = [
            item
            for item in self.rows
            if not (item["agroline_number"] == row["agroline_number"] and item.get("reading_kind") == kind)
        ]
        self.rows.append(row)
        return row


def _order(number: str, customer: str, sha: str | None = None) -> dict:
    return {
        "agroline_number": number,
        "customer_name": customer,
        "document_date": "2026-10-12",
        "pdf_url": f"https://files/{number}.pdf",
        "pdf_sha256": sha,
    }


def _order_occurrence():
    return SimpleNamespace(
        id="occ-order",
        template_id="tpl-a",
        branch_id="snif-1",
        assignee_user_id="oved-1",
        due_at="2026-10-12T18:00:00+03:00",
    )
