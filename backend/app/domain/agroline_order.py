"""Traduit une הזמנה Agroline, décide qui la voit, et quelle version garder."""
from __future__ import annotations

from app.domain.agroline_delivery import document_date

READING_FIRST = "first"
READING_LATEST = "latest"


def map_agroline_order(header: dict, *, fallback_date: str, pdf_url: str | None) -> dict:
    number = _order_number(header)
    customer = str(header.get("Customer_Name") or "").strip()
    return {
        "agroline_number": number[:32],
        "customer_name": customer[:200],
        "document_date": document_date(header, fallback_date),
        "pdf_url": pdf_url,
    }


def order_fingerprint(document: dict) -> str:
    customer = str(document.get("customer_name") or "").strip()
    day = str(document.get("document_date") or "")
    digest = str(document.get("pdf_sha256") or "")
    return f"{customer}\n{day}\n{digest}"


def next_reading(stored: list[dict], incoming: dict) -> str | None:
    """`None` : identique à la lecture précédente, on ne garde rien de neuf."""
    first = _kind(stored, READING_FIRST)
    if first is None:
        return READING_FIRST
    previous = _kind(stored, READING_LATEST) or first
    if order_fingerprint(previous) == order_fingerprint(incoming):
        return None
    if not incoming.get("pdf_sha256") and previous.get("pdf_sha256"):
        return None
    return READING_LATEST


def current_readings(rows: list[dict]) -> list[dict]:
    """Une הזמנה affichée : la dernière lecture si elle existe, sinon la première."""
    by_number: dict[str, dict] = {}
    for row in rows:
        number = str(row.get("agroline_number") or "")
        kept = by_number.get(number)
        if kept is None or _prefer_latest(row, kept):
            by_number[number] = row
    return [by_number[number] for number in sorted(by_number)]


def visible_orders(orders: list[dict], *, sees_all: bool, branch_id: str | None) -> list[dict]:
    if sees_all:
        return list(orders)
    if not branch_id:
        return []
    return [order for order in orders if order.get("branch_id") == branch_id]


def _kind(stored: list[dict], kind: str) -> dict | None:
    return next((row for row in stored if row.get("reading_kind") == kind), None)


def _prefer_latest(row: dict, kept: dict) -> bool:
    return row.get("reading_kind") == READING_LATEST and kept.get("reading_kind") != READING_LATEST


def _order_number(header: dict) -> str:
    number = str(header.get("OrderID") or header.get("Order_Num") or "").strip()
    if not number or number == "0":
        raise ValueError("חסר מספר הזמנה")
    return number
