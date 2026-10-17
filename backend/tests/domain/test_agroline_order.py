import pytest

from app.domain.agroline_order import (
    current_readings,
    map_agroline_order,
    next_reading,
    visible_orders,
)
from app.domain.delivery_note import is_order_read, opened_by_teuda


def test_an_order_keeps_its_number_customer_and_date():
    mapped = map_agroline_order(
        {"OrderID": 831155, "Customer_Name": "שפע", "Delivery_Date": "20261012"},
        fallback_date="2026-10-01",
        pdf_url="https://files/831155.pdf",
    )
    assert mapped == {
        "agroline_number": "831155",
        "customer_name": "שפע",
        "document_date": "2026-10-12",
        "pdf_url": "https://files/831155.pdf",
    }


def test_an_order_without_a_number_is_rejected():
    with pytest.raises(ValueError, match="מספר"):
        map_agroline_order({"OrderID": 0, "Customer_Name": "שפע"}, fallback_date="2026-10-12", pdf_url=None)


def test_the_employee_sees_his_snif_and_the_manager_sees_every_order():
    orders = [
        {"agroline_number": "1", "branch_id": "snif-1"},
        {"agroline_number": "2", "branch_id": "snif-2"},
        {"agroline_number": "3", "branch_id": None},
    ]
    assert [item["agroline_number"] for item in visible_orders(orders, sees_all=False, branch_id="snif-1")] == ["1"]
    assert [item["agroline_number"] for item in visible_orders(orders, sees_all=True, branch_id="snif-1")] == [
        "1",
        "2",
        "3",
    ]
    assert visible_orders(orders, sees_all=False, branch_id=None) == []


def test_a_reread_keeps_the_first_and_replaces_only_the_latest():
    first = {"reading_kind": "first", "customer_name": "שפע", "document_date": "2026-10-12", "pdf_sha256": "aaa"}
    changed = {"customer_name": "שפע", "document_date": "2026-10-12", "pdf_sha256": "bbb"}
    same = {"customer_name": "שפע", "document_date": "2026-10-12", "pdf_sha256": "aaa"}
    assert next_reading([], same) == "first"
    assert next_reading([first], same) is None
    assert next_reading([first], changed) == "latest"
    latest = {**changed, "reading_kind": "latest"}
    assert next_reading([first, latest], changed) is None
    assert next_reading([first, latest], {"customer_name": "שפע", "document_date": "2026-10-12", "pdf_sha256": "ccc"}) == "latest"
    failed = {"customer_name": "אחר", "document_date": "2026-10-12", "pdf_sha256": None}
    assert next_reading([first], failed) is None


def test_the_shown_order_is_the_latest_reading_when_it_exists():
    rows = [
        {"agroline_number": "1", "reading_kind": "first", "pdf_url": "old"},
        {"agroline_number": "1", "reading_kind": "latest", "pdf_url": "new"},
        {"agroline_number": "2", "reading_kind": "first", "pdf_url": "only"},
    ]
    shown = {row["agroline_number"]: row["pdf_url"] for row in current_readings(rows)}
    assert shown == {"1": "new", "2": "only"}


def test_only_the_order_task_stays_on_the_calendar():
    assert is_order_read("order_read") is True
    assert opened_by_teuda(True, "order_read") is False
    assert opened_by_teuda(True, "line_check") is True
    assert opened_by_teuda(False, "line_check") is False
