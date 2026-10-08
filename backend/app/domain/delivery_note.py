"""Règles du contrôle תעודת משלוח, sans I/O.

Une teuda est le document Agroline. Une ligne produit est dedans.
Un mishloah regroupe les teudot du même snif le même jour : il n'est pas assigné.
Un modèle est une tâche fixe : les questions restent, le PDF est posé sur l'occurrence.
"""
from __future__ import annotations

from datetime import date

LINE_OK = "ok"
LINE_PROBLEM = "problem"
LINE_STATUSES = frozenset({LINE_OK, LINE_PROBLEM})

OVERALL_ACCEPTED = "accepted"
OVERALL_PROBLEM = "problem"
OVERALLS = frozenset({OVERALL_ACCEPTED, OVERALL_PROBLEM})

TASK_TYPE_LINE_CHECK = "line_check"
TASK_TYPE_ORIGIN = "origin_list"
TASK_TYPES = frozenset({TASK_TYPE_LINE_CHECK, TASK_TYPE_ORIGIN})

KIND_FRESH = "fresh"
KIND_MIXED = "mixed"
_NAME_MARKS = {'"', "״", "'", "׳"}
_MIN_CONTAINED_CHARS = 4
KINDS = frozenset({KIND_FRESH, KIND_MIXED})

LINE_FIELDS = (
    "arrival",
    "received_qty",
    "condition",
    "rejected_qty",
    "note",
    "photo_url",
)


def mishloah_key(branch_id: str | None, document_date: str) -> tuple[str | None, str]:
    return (branch_id, document_date)


def group_mishloah(notes: list[dict]) -> list[dict]:
    """Regroupe par snif et par jour; une teuda sans snif garde `branch_id` à None (jamais "None")."""
    buckets: dict[tuple[str | None, str], list[dict]] = {}
    for note in notes:
        branch = note.get("branch_id")
        key = mishloah_key(str(branch) if branch else None, str(note["document_date"]))
        buckets.setdefault(key, []).append(note)
    return [
        {"branch_id": key[0], "document_date": key[1], "delivery_notes": rows}
        for key, rows in buckets.items()
    ]


def same_customer_name(left: str, right: str) -> bool:
    folded = _fold_name(left)
    return bool(folded) and folded == _fold_name(right)


def resolve_customer_branch(
    explicit_branch_id: str | None,
    customer_name: str,
    branches: list[tuple[str, str]],
) -> str | None:
    """Lien Agroline explicite, sinon un seul snif actif par nom replié."""
    if explicit_branch_id:
        return explicit_branch_id
    return branch_id_matching_customer(customer_name, branches)


def branch_id_matching_customer(
    customer_name: str, branches: list[tuple[str, str]]
) -> str | None:
    folded = _fold_name(customer_name)
    if not folded:
        return None
    exact = [branch_id for branch_id, name in branches if _fold_name(name) == folded]
    if len(exact) == 1:
        return exact[0]
    if exact:
        return None
    return _unique_contained_branch(folded, branches)


def _unique_contained_branch(folded: str, branches: list[tuple[str, str]]) -> str | None:
    found = [
        branch_id
        for branch_id, name in branches
        if _name_contains(folded, _fold_name(name))
    ]
    if len(found) == 1:
        return found[0]
    return None


def _name_contains(left: str, right: str) -> bool:
    if not left or not right or left == right:
        return False
    short, long = (left, right) if len(left) <= len(right) else (right, left)
    return len(short) >= _MIN_CONTAINED_CHARS and short in long


def _fold_name(value: str) -> str:
    cleaned = "".join(char for char in value.strip() if char not in _NAME_MARKS)
    return " ".join(cleaned.split())


def occurrence_title(template_title: str, agroline_number: str) -> str:
    title = template_title.strip()
    number = agroline_number.strip()
    return f"{title} {number}".strip()[:300]


def quantity_gap(expected: float, received: float) -> float:
    return round(float(expected) - float(received), 3)


def normalize_document(raw: object) -> dict:
    if not isinstance(raw, dict):
        raise ValueError("תעודה לא תקינה")
    number = str(raw.get("agroline_number") or "").strip()
    customer = str(raw.get("customer_name") or "").strip()
    if not number:
        raise ValueError("חסר מספר תעודה")
    if not customer:
        raise ValueError("חסר שם לקוח")
    document_date = _document_date(raw.get("document_date"))
    pdf = str(raw.get("pdf_url") or "").strip()
    return {
        "agroline_number": number[:32],
        "customer_name": customer[:200],
        "document_date": document_date,
        "kind": _kind(raw.get("kind")),
        "pdf_url": pdf[:1024] if pdf else None,
        "lines": normalize_lines(raw.get("lines")),
    }


def normalize_lines(raw: object) -> list[dict]:
    if not isinstance(raw, list) or not raw:
        raise ValueError("חסרות שורות מוצר")
    return [_one_line(item, index) for index, item in enumerate(raw, start=1)]


def validate_line_answer(raw: object, *, expected_qty: float) -> dict:
    del expected_qty
    if not isinstance(raw, dict):
        raise ValueError("תשובת שורה לא תקינה")
    status = str(raw.get("arrival") or "").strip()
    if status not in LINE_STATUSES:
        raise ValueError("יש לסמן אם השורה תקינה")
    return _status_answer(status, _note(raw), _photo(raw))


def line_is_fully_ok(answer: dict, expected_qty: float) -> bool:
    del expected_qty
    return answer.get("arrival") == LINE_OK


def suggest_overall_status(rows: list[dict]) -> str:
    if not rows:
        raise ValueError("חסרות שורות")
    if all(row.get("fully_ok") for row in rows):
        return OVERALL_ACCEPTED
    return OVERALL_PROBLEM


def task_type_for_model(opened: bool, raw: object) -> str | None:
    if not opened:
        return None
    kind = str(raw or "").strip() or TASK_TYPE_LINE_CHECK
    if kind not in TASK_TYPES:
        raise ValueError("סוג משימה לא תקין")
    return kind


def templates_to_open(active_ids: list[str], already_open: set[str]) -> list[str]:
    """Une occurrence par modèle. Le couple teuda + modèle ne s'ouvre qu'une fois."""
    chosen: list[str] = []
    for template_id in active_ids:
        if template_id in already_open or template_id in chosen:
            continue
        chosen.append(template_id)
    return chosen


def present_answer(stored: dict, expected_qty: float) -> dict:
    shown = {field: stored.get(field) for field in LINE_FIELDS}
    received = stored.get("received_qty")
    shown["gap"] = quantity_gap(expected_qty, float(received)) if received is not None else None
    shown["fully_ok"] = line_is_fully_ok(shown, expected_qty)
    return shown


def lines_with_origin(lines: list[dict]) -> list[dict]:
    return [line for line in lines if str(line.get("origin_name") or "").strip()]


def public_check(opening: dict) -> dict:
    task_type = opening.get("task_type") or TASK_TYPE_LINE_CHECK
    lines = [_public_line(line) for line in opening["lines"]]
    if task_type == TASK_TYPE_ORIGIN:
        lines = lines_with_origin(lines)
    answered = [line["answer"] for line in lines if line["answer"]]
    suggested = suggest_overall_status(answered) if lines and len(answered) == len(lines) else None
    return {
        "agroline_number": opening["agroline_number"],
        "document_date": opening["document_date"],
        "kind": opening["kind"],
        "pdf_url": opening["pdf_url"],
        "customer_name": opening["customer_name"],
        "overall_status": opening.get("overall_status"),
        "task_type": task_type,
        "suggested_overall": suggested,
        "lines": lines,
    }


def _origin_name(value: object) -> str | None:
    text = str(value or "").strip()
    return text[:80] or None


def _public_line(line: dict) -> dict:
    answer = line.get("answer")
    shown = present_answer(answer, float(line["quantity"])) if answer else None
    return {
        "id": line["id"],
        "position": line["position"],
        "product_name": line["product_name"],
        "quantity": line["quantity"],
        "unit": line["unit"],
        "origin_name": line.get("origin_name"),
        "weight": line.get("weight"),
        "price": line.get("price"),
        "image_url": line.get("image_url"),
        "answer": shown,
    }


def _document_date(value: object) -> str:
    text = str(value or "").strip()
    try:
        date.fromisoformat(text)
    except ValueError:
        raise ValueError("תאריך תעודה לא תקין") from None
    return text


def _kind(value: object) -> str:
    kind = str(value or "").strip()
    if kind not in KINDS:
        raise ValueError("סוג תעודה לא תקין")
    return kind


def _one_line(item: object, index: int) -> dict:
    if not isinstance(item, dict):
        raise ValueError("שורת מוצר לא תקינה")
    name = str(item.get("product_name") or "").strip()
    unit = str(item.get("unit") or "").strip()
    if not name:
        raise ValueError("חסר שם מוצר")
    if not unit:
        raise ValueError("חסרה יחידה")
    return {
        "position": index,
        "product_name": name[:200],
        "quantity": _quantity(item.get("quantity"), empty_ok=False),
        "unit": unit[:32],
        "origin_name": _origin_name(item.get("origin_name")),
        "weight": _measure(item.get("weight")),
        "price": _measure(item.get("price")),
        "image_url": _image_url(item.get("image_url")),
    }


def _measure(value: object) -> float | None:
    if value in (None, ""):
        return None
    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return None


def _image_url(value: object) -> str | None:
    text = str(value or "").strip()
    if not text.startswith("https://"):
        return None
    return text[:1024]


def _status_answer(status: str, note: str | None, photo: str | None) -> dict:
    if status == LINE_OK:
        if note or photo:
            raise ValueError("הערה ותמונה רק כשיש בעיה")
        note, photo = None, None
    elif not note:
        raise ValueError("חסרה הערה")
    return {
        "arrival": status,
        "received_qty": None,
        "condition": None,
        "rejected_qty": None,
        "note": note,
        "photo_url": photo,
        "gap": None,
        "fully_ok": status == LINE_OK,
    }


def _quantity(value: object, *, empty_ok: bool) -> float | None:
    if not _present(value):
        if empty_ok:
            return None
        raise ValueError("חסרה כמות")
    try:
        qty = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        raise ValueError("כמות לא תקינה") from None
    if qty < 0:
        raise ValueError("כמות לא תקינה")
    return round(qty, 3)


def _present(value: object) -> bool:
    return value is not None and value != ""


def _note(raw: dict) -> str | None:
    text = str(raw.get("note") or "").strip()
    return text[:500] or None


def _photo(raw: dict) -> str | None:
    url = str(raw.get("photo_url") or "").strip()
    return url[:1024] or None
