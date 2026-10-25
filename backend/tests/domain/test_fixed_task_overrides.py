"""Règles pures : adaptations par snif d'une tâche קבועה réseau."""
from types import SimpleNamespace

import pytest

from app.domain import fixed_task_overrides as ov


def _tpl(id_="t1", **over):
    base = dict(
        id=id_,
        title="בדיקה",
        description="",
        due_time="09:00",
        weekly_days=None,
        is_active=True,
        start_url=None,
        reference_photo_url=None,
        reference_video_url=None,
        reference_audio_url=None,
        overridden_fields=[],
        network_group_id="g1",
        created_at="2026-01-01",
    )
    base.update(over)
    return SimpleNamespace(**base)


def test_normalize_fields_drops_unknown_and_duplicates():
    assert ov.normalize_fields(["due_time", "bogus", "due_time", "is_active"]) == [
        "due_time",
        "is_active",
    ]
    assert ov.normalize_fields(None) == []


def test_group_defaults_ignore_overridden_members():
    members = [
        _tpl("a", due_time="09:00"),
        _tpl("b", due_time="09:00"),
        _tpl("c", due_time="07:30", overridden_fields=["due_time"]),
    ]
    assert ov.group_defaults(members)["due_time"] == "09:00"


def test_group_defaults_fall_back_when_everyone_overridden():
    members = [
        _tpl("a", due_time="07:00", overridden_fields=["due_time"]),
        _tpl("b", due_time="07:00", overridden_fields=["due_time"]),
    ]
    assert ov.group_defaults(members)["due_time"] == "07:00"


def test_preserve_overrides_keeps_branch_values_only_for_overridden_fields():
    sibling = _tpl(due_time="07:30", description="מקומי", overridden_fields=["due_time"])
    merged = ov.preserve_overrides({"due_time": "10:00", "description": "כללי"}, sibling)
    assert merged["due_time"] == "07:30"
    assert merged["description"] == "כללי"


def test_preserve_overrides_blocks_start_url_update():
    sibling = _tpl(start_url="https://x.test", overridden_fields=["start_url"])
    merged = ov.preserve_overrides({"start_url": "https://y.test", "update_start_url": True}, sibling)
    assert merged["start_url"] == "https://x.test"
    assert merged["update_start_url"] is False


def test_next_overridden_marks_changed_and_unmarks_when_equal_to_default():
    tpl = _tpl()
    defaults = {"due_time": "09:00"}
    assert ov.next_overridden(tpl, defaults, {"due_time": "07:30"}, []) == ["due_time"]
    tpl.overridden_fields = ["due_time"]
    assert ov.next_overridden(tpl, defaults, {"due_time": "09:00"}, []) == []


def test_next_overridden_reset_removes_field():
    tpl = _tpl(overridden_fields=["due_time", "is_active"])
    assert ov.next_overridden(tpl, {}, {}, ["due_time"]) == ["is_active"]


def test_reset_values_copy_defaults_including_media_group():
    defaults = {"due_time": "09:00", "reference_photo_url": "p", "reference_video_url": None,
                "reference_audio_url": None}
    values = ov.reset_values(defaults, ["due_time", "reference_media", "nope"])
    assert values == {
        "due_time": "09:00",
        "reference_photo_url": "p",
        "reference_video_url": None,
        "reference_audio_url": None,
    }


def test_split_into_groups_groups_by_network_id_and_sorts_by_title():
    a1 = _tpl("a1", title="ב", network_group_id="g1", created_at="2026-01-02")
    a2 = _tpl("a2", title="ב", network_group_id="g1", created_at="2026-01-01")
    solo = _tpl("s", title="א", network_group_id=None)
    groups = ov.split_into_groups([a1, a2, solo])
    assert [[t.id for t in g] for g in groups] == [["s"], ["a2", "a1"]]


def test_split_into_groups_empty_list():
    assert ov.split_into_groups([]) == []


@pytest.mark.parametrize("field", ov.OVERRIDABLE_FIELDS)
def test_every_overridable_field_has_attrs(field):
    assert ov.FIELD_ATTRS[field]
