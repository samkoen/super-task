from app.domain.completion_media import (
    assert_attachments_match,
    assert_completion_media,
    has_required_completion_visual_media,
    normalize_min_video_seconds,
    normalize_requirements,
    parse_requirements_input,
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
