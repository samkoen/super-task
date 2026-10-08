"""Traduit une תעודה Agroline vers le document que Super sait ouvrir."""
from __future__ import annotations

from datetime import date


def map_agroline_delivery(
    header: dict,
    detail_rows: list[dict],
    *,
    pdf_url: str | None,
    fallback_date: str,
) -> dict:
    number = _number(header)
    customer = str(header.get("Customer_Name") or "").strip()
    if not customer:
        raise ValueError("חסר שם לקוח")
    lines = lines_for_delivery(header, detail_rows)
    if not lines:
        raise ValueError("חסרות שורות מוצר")
    return {
        "agroline_number": number[:32],
        "customer_name": customer[:200],
        "document_date": document_date(header, fallback_date),
        "kind": kind_from_group(str(header.get("GroupDesc") or "")),
        "pdf_url": pdf_url,
        "lines": lines,
    }


def lines_for_delivery(header: dict, detail_rows: list[dict]) -> list[dict]:
    number = str(header.get("Delivery_Num") or "")
    sub = header.get("Delivery_Sub")
    lines: list[dict] = []
    for row in detail_rows:
        if str(row.get("Delivery_Num") or number) != number and row.get("Delivery_Num") is not None:
            continue
        if not _same_sub(sub, row.get("Delivery_Sub")):
            continue
        name = str(row.get("ProductDesc") or row.get("Product_Name") or "").strip()
        if not name:
            continue
        lines.append(
            {
                "product_name": name,
                "quantity": _quantity(row),
                "unit": str(row.get("Pack_Name") or row.get("UnitDesc") or "יח").strip() or "יח",
                "origin_name": _origin(row),
                "weight": _weight(row),
                "price": _price(row),
                "image_url": _image_url(row),
            }
        )
    return lines


def kind_from_group(group: str) -> str:
    return "fresh" if "טרי" in group else "mixed"


def document_date(header: dict, fallback: str) -> str:
    raw = str(header.get("Delivery_Date") or "")
    if len(raw) >= 10 and raw[4] == "-" and raw[7] == "-":
        return raw[:10]
    digits = "".join(char for char in raw if char.isdigit())
    if len(digits) >= 8:
        return f"{digits[:4]}-{digits[4:6]}-{digits[6:8]}"
    return fallback


def _number(header: dict) -> str:
    number = str(header.get("Delivery_Num") or "").strip()
    if not number:
        raise ValueError("חסר מספר תעודה")
    sub = header.get("Delivery_Sub")
    if sub in (None, "", 0, "0"):
        return number
    return f"{number}-{sub}"


def _same_sub(header_sub: object, row_sub: object) -> bool:
    if row_sub in (None, ""):
        return True
    if header_sub in (None, "", 0, "0"):
        return row_sub in (None, "", 0, "0")
    return str(row_sub) == str(header_sub)


def _origin(row: dict) -> str | None:
    for key in ("OriginCountryDesc", "OriginCountry", "CountryDesc"):
        country = str(row.get(key) or "").strip()
        if country:
            return country[:80]
    return None


def _weight(row: dict) -> float | None:
    for key in ("WeightNeto", "WeightNetto", "WeightBuy", "WeightBrutto"):
        number = _decimal(row.get(key))
        if number is not None:
            return number
    return None


def _price(row: dict) -> float | None:
    return _decimal(row.get("SalePrice"))


def _image_url(row: dict) -> str | None:
    try:
        product_id = int(row.get("GeneralProductID"))
    except (TypeError, ValueError):
        return None
    if product_id <= 0:
        return None
    return f"https://my.agroline.co.il/v1/images/products/{product_id}.png"


def _decimal(value: object) -> float | None:
    if value in (None, ""):
        return None
    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return None


def _quantity(row: dict) -> object:
    for key in ("Quantity", "WeightNetto", "WeightBrutto", "Weight"):
        value = row.get(key)
        if value not in (None, ""):
            return value
    return 0
