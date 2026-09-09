"""Diff d'édition réseau : ne recopier que les champs changés."""
from types import SimpleNamespace

from app.domain.network_edit_diff import (
    merge_occurrence_network_details,
    merge_template_network_payload,
)


def _tpl(**over):
    base = dict(
        title="כותרת",
        description="",
        due_time="09:00",
        weekly_days=None,
        is_active=True,
        is_work_start=False,
        is_work_end=False,
        reference_photo_url=None,
        reference_video_url=None,
        reference_audio_url=None,
        ops_category="cleaning",
        start_url=None,
        completion_requirements=[],
        min_video_seconds=None,
        photo_required=False,
    )
    base.update(over)
    return SimpleNamespace(**base)


def _occ(**over):
    base = dict(
        title="ביקור",
        description="",
        due_at="2026-08-18T10:00:00+03:00",
        photo_required=False,
        completion_requirements=[],
        min_video_seconds=None,
        reference_photo_url=None,
        reference_video_url=None,
        reference_audio_url=None,
        start_url=None,
    )
    base.update(over)
    return SimpleNamespace(**base)


def _template_payload(**over):
    body = {
        "title": "כותרת",
        "description": "",
        "due_time": "09:00",
        "weekly_days": None,
        "is_active": True,
        "reference_photo_url": None,
        "reference_video_url": None,
        "reference_audio_url": None,
        "ops_category": "cleaning",
        "update_ops_category": False,
        "is_work_start": False,
        "is_work_end": False,
        "start_url": None,
        "update_start_url": False,
        "completion_requirements": [],
        "update_completion_requirements": False,
        "update_min_video_seconds": False,
        "min_video_seconds": None,
        "photo_required": False,
    }
    body.update(over)
    return body


def test_sibling_keeps_local_title_when_only_description_changes():
    existing = _tpl()
    sibling = _tpl(title="כותרת סניף")
    merged = merge_template_network_payload(
        existing, _template_payload(description="חדש"), sibling
    )
    assert merged["title"] == "כותרת סניף"
    assert merged["description"] == "חדש"


def test_changed_title_overwrites_sibling_local_title():
    existing = _tpl()
    sibling = _tpl(title="כותרת סניף")
    merged = merge_template_network_payload(
        existing, _template_payload(title="לכולם"), sibling
    )
    assert merged["title"] == "לכולם"


def test_unchanged_ops_keeps_sibling_category():
    existing = _tpl(ops_category="cleaning")
    sibling = _tpl(ops_category="orders")
    merged = merge_template_network_payload(
        existing,
        _template_payload(update_ops_category=True, ops_category="cleaning"),
        sibling,
    )
    assert merged["ops_category"] == "orders"
    assert merged["update_ops_category"] is False


def _occ_details(existing, **over) -> dict:
    from datetime import datetime

    body = {
        "title": "ביקור",
        "description": "",
        "due_at": datetime.fromisoformat(existing.due_at),
        "photo_required": False,
        "update_min_video_seconds": False,
        "update_completion_requirements": False,
        "completion_requirements": [],
        "update_reference_photo": False,
        "update_reference_video": False,
        "update_reference_audio": False,
        "update_start_url": False,
        "start_url": None,
        "reference_photo_url": None,
        "reference_video_url": None,
        "reference_audio_url": None,
        "min_video_seconds": None,
    }
    body.update(over)
    return body


def test_occurrence_keeps_local_title_when_due_unchanged():
    from datetime import datetime

    existing = _occ()
    sibling = _occ(title="כותרת סניף")
    merged = merge_occurrence_network_details(
        existing, _occ_details(existing, description="חדש"), sibling
    )
    assert merged["title"] == "כותרת סניף"
    assert merged["description"] == "חדש"
    assert merged["due_at"] == datetime.fromisoformat(sibling.due_at)


def test_occurrence_changed_title_overwrites_sibling():
    existing = _occ()
    sibling = _occ(title="כותרת סניף")
    merged = merge_occurrence_network_details(
        existing, _occ_details(existing, title="לכולם"), sibling
    )
    assert merged["title"] == "לכולם"


def test_occurrence_changed_photo_required_overwrites_sibling():
    existing = _occ(photo_required=False)
    sibling = _occ(photo_required=False, title="כותרת סניף")
    merged = merge_occurrence_network_details(
        existing, _occ_details(existing, photo_required=True), sibling
    )
    assert merged["photo_required"] is True
    assert merged["title"] == "כותרת סניף"


def test_occurrence_keeps_local_photo_required_when_unchanged():
    existing = _occ(photo_required=False)
    sibling = _occ(photo_required=True)
    merged = merge_occurrence_network_details(existing, _occ_details(existing), sibling)
    assert merged["photo_required"] is True
