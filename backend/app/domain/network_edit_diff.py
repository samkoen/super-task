"""Diff d'édition réseau : ne propager que les champs vraiment changés."""

from datetime import datetime

from app.domain.completion_media import parse_requirements_input


def _text(value) -> str:
    return (value or "").strip()


def _days(value) -> str:
    return value or ""


def _url(value) -> str:
    return (value or "").strip()


def requirements_equal(left, right) -> bool:
    a = parse_requirements_input(left, provided=True) if left is not None else []
    b = parse_requirements_input(right, provided=True) if right is not None else []
    return a == b


def due_at_equal(left, right) -> bool:
    return _as_due(left) == _as_due(right)


def _as_due(value) -> datetime:
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value))


def merge_template_network_payload(existing, payload: dict, sibling) -> dict:
    merged = dict(payload)
    _overlay_text(merged, existing, sibling, payload, "title")
    _overlay_text(merged, existing, sibling, payload, "description")
    _overlay_text(merged, existing, sibling, payload, "due_time")
    if _days(payload.get("weekly_days")) == _days(getattr(existing, "weekly_days", None)):
        merged["weekly_days"] = sibling.weekly_days
    if bool(payload.get("is_active")) == bool(existing.is_active):
        merged["is_active"] = sibling.is_active
    _overlay_work_flags(merged, existing, sibling, payload)
    _overlay_media_urls(merged, existing, sibling, payload)
    _overlay_ops(merged, existing, sibling, payload)
    _overlay_start_url(merged, existing, sibling, payload)
    _overlay_completion(merged, existing, sibling, payload)
    return merged


def merge_occurrence_network_details(existing, details: dict, sibling) -> dict:
    merged = dict(details)
    _overlay_text(merged, existing, sibling, details, "title")
    _overlay_text(merged, existing, sibling, details, "description")
    if due_at_equal(existing.due_at, details["due_at"]):
        merged["due_at"] = _as_due(sibling.due_at)
    _overlay_occurrence_media(merged, existing, sibling, details)
    _overlay_start_url(merged, existing, sibling, details)
    _overlay_completion(merged, existing, sibling, details)
    _overlay_photo_required(merged, existing, sibling, details)
    return merged


def _overlay_text(merged, existing, sibling, incoming: dict, field: str) -> None:
    if _text(incoming.get(field)) == _text(getattr(existing, field, None)):
        merged[field] = getattr(sibling, field)


def _overlay_work_flags(merged, existing, sibling, incoming: dict) -> None:
    if bool(incoming.get("is_work_start")) == bool(getattr(existing, "is_work_start", False)):
        merged["is_work_start"] = bool(getattr(sibling, "is_work_start", False))
    if bool(incoming.get("is_work_end")) == bool(getattr(existing, "is_work_end", False)):
        merged["is_work_end"] = bool(getattr(sibling, "is_work_end", False))


def _overlay_media_urls(merged, existing, sibling, incoming: dict) -> None:
    for field in ("reference_photo_url", "reference_video_url", "reference_audio_url"):
        if _url(incoming.get(field)) == _url(getattr(existing, field, None)):
            merged[field] = getattr(sibling, field)


def _overlay_ops(merged, existing, sibling, incoming: dict) -> None:
    if not incoming.get("update_ops_category"):
        merged["ops_category"] = sibling.ops_category
        merged["update_ops_category"] = False
        return
    if incoming.get("ops_category") == existing.ops_category:
        merged["ops_category"] = sibling.ops_category
        merged["update_ops_category"] = False


def _overlay_start_url(merged, existing, sibling, incoming: dict) -> None:
    if not incoming.get("update_start_url"):
        merged["start_url"] = getattr(sibling, "start_url", None)
        merged["update_start_url"] = False
        return
    if _url(incoming.get("start_url")) == _url(getattr(existing, "start_url", None)):
        merged["start_url"] = sibling.start_url
        merged["update_start_url"] = False


def _overlay_occurrence_media(merged, existing, sibling, details: dict) -> None:
    pairs = (
        ("update_reference_photo", "reference_photo_url"),
        ("update_reference_video", "reference_video_url"),
        ("update_reference_audio", "reference_audio_url"),
    )
    for flag, field in pairs:
        if not details.get(flag):
            merged[flag] = False
            continue
        if _url(details.get(field)) == _url(getattr(existing, field, None)):
            merged[flag] = False
            merged[field] = getattr(sibling, field)


def _overlay_completion(merged, existing, sibling, incoming: dict) -> None:
    updating = incoming.get("update_completion_requirements") or incoming.get(
        "update_min_video_seconds"
    )
    if not updating:
        _keep_sibling_completion(merged, sibling)
        return
    if requirements_equal(
        incoming.get("completion_requirements"),
        getattr(existing, "completion_requirements", None),
    ):
        _keep_sibling_completion(merged, sibling)


def _keep_sibling_completion(merged: dict, sibling) -> None:
    merged["completion_requirements"] = sibling.completion_requirements
    merged["update_completion_requirements"] = False
    merged["update_min_video_seconds"] = False
    merged["min_video_seconds"] = getattr(sibling, "min_video_seconds", None)
    merged["photo_required"] = getattr(sibling, "photo_required", None)


def _overlay_photo_required(merged, existing, sibling, details: dict) -> None:
    if merged.get("update_completion_requirements"):
        return
    incoming = details.get("photo_required")
    if incoming is None or bool(incoming) == bool(existing.photo_required):
        merged["photo_required"] = sibling.photo_required
