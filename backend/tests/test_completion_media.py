from app.domain.completion_media import (
    assert_attachments_match,
    assert_completion_media,
    drop_stale_migrated_photo,
    effective_requirements,
    has_required_completion_visual_media,
    merge_completion_requirements,
    normalize_min_video_seconds,
    normalize_requirements,
    parse_requirements_input,
    requirement_example_urls,
)
import pytest


def test_photo_alone_satisfies_requirement():
    assert has_required_completion_visual_media("/uploads/a.jpg", None) is True


def test_video_alone_satisfies_requirement():
    assert has_required_completion_visual_media(None, "/uploads/a.mp4") is True


def test_audio_alone_does_not_satisfy_requirement():
    assert has_required_completion_visual_media("", "") is False
    assert has_required_completion_visual_media(None, None) is False
    assert has_required_completion_visual_media("  ", "  ") is False


def test_whitespace_paths_are_ignored():
    assert has_required_completion_visual_media("   ", "/uploads/v.mp4") is True


def test_normalize_min_video_seconds():
    assert normalize_min_video_seconds(None) is None
    assert normalize_min_video_seconds("") is None
    assert normalize_min_video_seconds(0) is None
    assert normalize_min_video_seconds("8") == 8
    with pytest.raises(ValueError):
        normalize_min_video_seconds(9999)


def test_assert_min_video_rejects_photo_only():
    with pytest.raises(ValueError, match="וידאו"):
        assert_completion_media(
            photo_path="/p.jpg",
            video_path=None,
            min_video_seconds=5,
            video_duration_seconds=None,
            requires_visual=True,
        )


def test_assert_min_video_rejects_too_short():
    with pytest.raises(ValueError, match="5"):
        assert_completion_media(
            photo_path=None,
            video_path="/v.mp4",
            min_video_seconds=5,
            video_duration_seconds=4,
            requires_visual=True,
        )


def test_assert_min_video_accepts_long_enough():
    assert_completion_media(
        photo_path=None,
        video_path="/v.mp4",
        min_video_seconds=5,
        video_duration_seconds=5,
        requires_visual=True,
    )


def test_empty_requirements_allow_no_media():
    assert_attachments_match([], [])


def test_two_videos_and_photo_must_all_match():
    reqs = normalize_requirements(
        [
            {"kind": "video", "min_seconds": 15},
            {"kind": "photo"},
            {"kind": "video", "min_seconds": 10},
        ]
    )
    assert_attachments_match(
        reqs,
        [
            {"kind": "video", "url": "/v1.mp4", "duration_seconds": 16},
            {"kind": "photo", "url": "/p.jpg"},
            {"kind": "video", "url": "/v2.mp4", "duration_seconds": 10},
        ],
    )


def test_second_video_too_short_is_rejected():
    reqs = normalize_requirements(
        [{"kind": "video", "min_seconds": 10}, {"kind": "video", "min_seconds": 12}]
    )
    with pytest.raises(ValueError, match="12"):
        assert_attachments_match(
            reqs,
            [
                {"kind": "video", "url": "/v1.mp4", "duration_seconds": 20},
                {"kind": "video", "url": "/v2.mp4", "duration_seconds": 8},
            ],
        )


def test_invalid_requirement_kind_rejected():
    with pytest.raises(ValueError, match="סוג"):
        normalize_requirements([{"kind": "pdf"}])


def test_parse_requirements_prefers_explicit_list():
    reqs = parse_requirements_input(
        [{"kind": "audio"}],
        provided=True,
        photo_required=True,
        min_video_seconds=30,
    )
    assert reqs == [{"kind": "audio"}]


def test_normalize_keeps_visual_slot_title_and_example():
    reqs = normalize_requirements(
        [
            {
                "kind": "photo",
                "title": "  מדף חלב  ",
                "hint": "  לצלם את כל השורה  ",
                "example_url": "/uploads/task_photos/shelf.jpg",
            },
            {
                "kind": "video",
                "min_seconds": 12,
                "title": "ניקוי קופה",
                "example_url": "/uploads/task_photos/till.jpg",
            },
            {
                "kind": "audio",
                "title": "ignored",
                "example_url": "/uploads/task_photos/no.jpg",
            },
        ]
    )
    assert reqs[0] == {
        "kind": "photo",
        "title": "מדף חלב",
        "hint": "לצלם את כל השורה",
        "example_url": "/uploads/task_photos/shelf.jpg",
    }
    assert reqs[1]["title"] == "ניקוי קופה"
    assert reqs[1]["example_url"] == "/uploads/task_photos/till.jpg"
    assert reqs[2] == {"kind": "audio"}


def test_requirement_example_urls_skips_audio_and_empty():
    assert requirement_example_urls(None) == []
    assert requirement_example_urls(
        [
            {"kind": "photo", "example_url": "/a.jpg"},
            {"kind": "video", "example_url": "  "},
            {"kind": "audio", "example_url": "/no.jpg"},
        ]
    ) == ["/a.jpg"]


def test_merge_uses_template_guides_when_occurrence_has_kinds_only():
    merged = merge_completion_requirements(
        [{"kind": "photo"}, {"kind": "video", "min_seconds": 10}],
        [
            {
                "kind": "photo",
                "title": "מדף",
                "hint": "כל השורה",
                "example_url": "/ex.jpg",
            },
            {"kind": "video", "min_seconds": 10, "title": "קופה", "example_url": "/v.jpg"},
        ],
    )
    assert merged[0]["title"] == "מדף"
    assert merged[0]["hint"] == "כל השורה"
    assert merged[0]["example_url"] == "/ex.jpg"
    assert merged[1]["title"] == "קופה"


def test_merge_fills_missing_example_without_dropping_occurrence_title():
    merged = merge_completion_requirements(
        [{"kind": "photo", "title": "מדף"}],
        [{"kind": "photo", "title": "תבנית", "hint": "הסבר", "example_url": "/ex.jpg"}],
    )
    assert merged == [
        {"kind": "photo", "title": "מדף", "hint": "הסבר", "example_url": "/ex.jpg"}
    ]


def test_merge_keeps_explicit_empty_occurrence_requirements():
    assert merge_completion_requirements([], [{"kind": "photo"}]) == []


def test_stale_migrated_photo_is_dropped_when_not_required():
    assert drop_stale_migrated_photo(
        [{"kind": "photo"}],
        photo_required=False,
    ) == []
    assert effective_requirements(
        [{"kind": "photo"}],
        photo_required=False,
    ) == []


def test_stale_migrated_photo_kept_when_required_or_named():
    assert drop_stale_migrated_photo(
        [{"kind": "photo"}],
        photo_required=True,
    ) == [{"kind": "photo"}]
    assert effective_requirements(
        [{"kind": "photo", "title": "מדף"}],
        photo_required=False,
    ) == [{"kind": "photo", "title": "מדף"}]
