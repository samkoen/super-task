import pytest

from app.domain.completion_media import normalize_attachments
from app.domain.geo import distance_meters, normalize_coordinates, normalize_location


def test_coordinates_empty_means_none():
    assert normalize_coordinates(None, "") is None


def test_coordinates_parse_strings():
    assert normalize_coordinates("31.77", "35.21") == (31.77, 35.21)


@pytest.mark.parametrize("lat,lng", [(31.7, None), (None, 35.2), (91, 35), (31, 181), ("x", 35), (True, 35)])
def test_coordinates_invalid(lat, lng):
    with pytest.raises(ValueError):
        normalize_coordinates(lat, lng)


def test_location_keeps_rounded_values_and_accuracy():
    loc = normalize_location({"lat": 31.7712345678, "lng": 35.2, "accuracy": 12.34})
    assert loc == {"lat": 31.771235, "lng": 35.2, "accuracy": 12.3}


def test_location_without_accuracy():
    assert normalize_location({"lat": 1, "lng": 2}) == {"lat": 1.0, "lng": 2.0}


@pytest.mark.parametrize("raw", [None, "x", {}, {"lat": 100, "lng": 0}, {"lat": 1}])
def test_location_invalid_is_ignored_never_raises(raw):
    assert normalize_location(raw) is None


def test_distance_zero_and_known_value():
    assert distance_meters(31.77, 35.21, 31.77, 35.21) == pytest.approx(0, abs=0.01)
    # 0.001° de latitude ≈ 111 m
    assert distance_meters(31.0, 35.0, 31.001, 35.0) == pytest.approx(111.2, abs=1)


def test_attachment_keeps_location_for_video_only_visual():
    video = {"kind": "video", "url": "u", "duration_seconds": 5, "location": {"lat": 1, "lng": 2}}
    audio = {"kind": "audio", "url": "a", "location": {"lat": 1, "lng": 2}}
    out = normalize_attachments([video, audio])
    assert out[0]["location"] == {"lat": 1.0, "lng": 2.0}
    assert "location" not in out[1]
