import pytest

from app.domain.delivery_note import (
    LINE_FIELDS,
    LINE_STATUSES,
    OVERALLS,
    branch_id_matching_customer,
    group_mishloah,
    normalize_document,
    lines_with_origin,
    occurrence_title,
    public_check,
    resolve_customer_branch,
    same_customer_name,
    suggest_overall_status,
    TASK_TYPES,
    task_type_for_model,
    templates_to_open,
    validate_line_answer,
)


def _ok_line(**extra):
    raw = {"arrival": "ok"}
    raw.update(extra)
    return validate_line_answer(raw, expected_qty=12)


def test_teuda_task_types_are_the_line_check_and_the_origin_list():
    assert set(TASK_TYPES) == {"line_check", "origin_list"}
    assert task_type_for_model(True, None) == "line_check"
    assert task_type_for_model(True, "origin_list") == "origin_list"
    assert task_type_for_model(False, "line_check") is None
    with pytest.raises(ValueError, match="סוג"):
        task_type_for_model(True, "photo")


def test_origin_task_keeps_only_products_that_have_a_country():
    shown = public_check(_opening("origin_list"))
    assert [line["product_name"] for line in shown["lines"]] == ["תפוח נאשי"]
    assert shown["lines"][0]["origin_name"] == "סין"
    assert [line["product_name"] for line in public_check(_opening("line_check"))["lines"]] == [
        "תפוח נאשי",
        "עגבניה",
    ]
    assert lines_with_origin([{"origin_name": "  "}, {"origin_name": "איטליה"}]) == [
        {"origin_name": "איטליה"}
    ]


def _opening(task_type: str) -> dict:
    return {
        "agroline_number": "2318018",
        "document_date": "2026-10-07",
        "kind": "fresh",
        "pdf_url": None,
        "customer_name": "יד השם",
        "task_type": task_type,
        "lines": [
            {
                "id": "1",
                "position": 1,
                "product_name": "תפוח נאשי",
                "quantity": 1,
                "unit": "קרטון",
                "origin_name": "סין",
            },
            {
                "id": "2",
                "position": 2,
                "product_name": "עגבניה",
                "quantity": 1,
                "unit": "ארגז",
                "origin_name": None,
            },
        ],
    }


def test_line_status_is_ok_or_problem():
    assert "arrival" in LINE_FIELDS
    assert "note" in LINE_FIELDS
    assert {"ok", "problem"} == set(LINE_STATUSES)
    assert {"accepted", "problem"} == set(OVERALLS)


def test_mishloah_groups_same_branch_and_day_only():
    groups = group_mishloah(
        [
            {"branch_id": "snif", "document_date": "2026-10-02", "agroline_number": "2315109"},
            {"branch_id": "snif", "document_date": "2026-10-02", "agroline_number": "2315108"},
            {"branch_id": "snif", "document_date": "2026-10-03", "agroline_number": "2315200"},
        ]
    )
    same_day = next(group for group in groups if group["document_date"] == "2026-10-02")
    assert len(same_day["delivery_notes"]) == 2
    assert len(groups) == 2


def test_mishloah_keeps_unlinked_notes_in_their_own_group_with_null_branch():
    groups = group_mishloah(
        [
            {"branch_id": None, "document_date": "2026-10-02", "agroline_number": "1"},
            {"branch_id": "snif", "document_date": "2026-10-02", "agroline_number": "2"},
            {"branch_id": None, "document_date": "2026-10-02", "agroline_number": "3"},
        ]
    )
    unlinked = next(group for group in groups if group["branch_id"] is None)
    assert len(unlinked["delivery_notes"]) == 2
    assert len(groups) == 2
    assert all(group["branch_id"] != "None" for group in groups)


def test_customer_name_matches_the_snif_despite_quotes():
    assert same_customer_name('שפע החיד"א', "שפע החידא")
    assert not same_customer_name("שפע המגיד", "שפע המגיד ממזריטש")


def test_unique_contained_name_links_the_snif():
    assert branch_id_matching_customer("יד השם", [("beiter", "יד השם ביתר")]) == "beiter"
    assert branch_id_matching_customer("שפע המגיד", [("mez", "שפע המגיד ממזריטש")]) == "mez"
    assert branch_id_matching_customer("יד השם ביתר", [("short", "יד השם")]) == "short"
    assert branch_id_matching_customer('יד ה"שם', [("beiter", "יד השם ביתר")]) == "beiter"


def test_two_branches_containing_the_name_stay_unlinked():
    branches = [("beiter", "יד השם ביתר"), ("yeru", "יד השם ירושלים")]
    assert branch_id_matching_customer("יד השם", branches) is None
    assert branch_id_matching_customer("יד השם", [("a", "יד השם"), ("b", "יד השם")]) is None


def test_explicit_link_wins_over_a_contained_name():
    branches = [("beiter", "יד השם ביתר")]
    assert resolve_customer_branch("linked-snif", "יד השם", branches) == "linked-snif"


def test_exact_folded_name_wins_and_a_short_fragment_does_not():
    branches = [("exact", "יד השם"), ("longer", "יד השם ביתר")]
    assert branch_id_matching_customer("יד  השם", branches) == "exact"
    assert branch_id_matching_customer("שפ", [("a", "שפע המגיד")]) is None
    assert branch_id_matching_customer("שפ", [("a", "שפ")]) == "a"
    assert branch_id_matching_customer("שפע", [("only", "שפע המגיד")]) is None
    assert branch_id_matching_customer("ביתר", [("only", "יד השם ביתר")]) == "only"


def test_occurrence_title_carries_the_number():
    assert occurrence_title("בדיקת קבלה", "2315109") == "בדיקת קבלה 2315109"


def test_problem_line_requires_a_note_and_keeps_the_photo():
    with pytest.raises(ValueError, match="הערה"):
        validate_line_answer({"arrival": "problem"}, expected_qty=12)
    answer = validate_line_answer(
        {"arrival": "problem", "note": "רקוב", "photo_url": "https://files/a.jpg"},
        expected_qty=12,
    )
    assert answer["note"] == "רקוב"
    assert answer["photo_url"] == "https://files/a.jpg"
    assert answer["fully_ok"] is False


def test_ok_line_rejects_a_note():
    with pytest.raises(ValueError, match="רק כשיש בעיה"):
        _ok_line(note="מיותר")


def test_suggest_overall_from_lines():
    good = _ok_line()
    problem = validate_line_answer({"arrival": "problem", "note": "פגום"}, expected_qty=4)
    assert suggest_overall_status([good, good]) == "accepted"
    assert suggest_overall_status([good, problem]) == "problem"


def test_templates_open_once_per_model():
    assert templates_to_open(["a", "b", "a"], {"b"}) == ["a"]


def test_document_requires_lines_and_known_kind():
    with pytest.raises(ValueError, match="שורות"):
        normalize_document(
            {
                "agroline_number": "2315109",
                "customer_name": "שפע",
                "document_date": "2026-10-02",
                "kind": "fresh",
                "lines": [],
            }
        )
    with pytest.raises(ValueError, match="סוג"):
        normalize_document(
            {
                "agroline_number": "2315109",
                "customer_name": "שפע",
                "document_date": "2026-10-02",
                "kind": "other",
                "lines": [{"product_name": "עגבניות", "quantity": 12, "unit": "ק״ג"}],
            }
        )
