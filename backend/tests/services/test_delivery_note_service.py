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

    def notes_for_branch(self, branch_id):
        return [note for note in self.notes.values() if note.get("branch_id") == branch_id]

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
