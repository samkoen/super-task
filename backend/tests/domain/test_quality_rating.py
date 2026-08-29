import pytest

from app.domain.quality_rating import (
    aggregate_quality_ratings,
    empty_quality_summary,
    normalize_quality_rating,
)


def test_normalize_accepts_one_to_five():
    assert normalize_quality_rating(1) == 1
    assert normalize_quality_rating("5") == 5


def test_normalize_rejects_out_of_range():
    with pytest.raises(ValueError, match="1 ל-5"):
        normalize_quality_rating(0)
    with pytest.raises(ValueError, match="1 ל-5"):
        normalize_quality_rating(6)
    with pytest.raises(ValueError, match="1 ל-5"):
        normalize_quality_rating(None)


def test_aggregate_empty():
    assert aggregate_quality_ratings([]) == empty_quality_summary()


def test_aggregate_overall_is_volume_weighted():
    summary = aggregate_quality_ratings(
        [
            ("cleaning", 5),
            ("cleaning", 5),
            ("cleaning", 5),
            ("fronts_signage", 1),
        ]
    )
    assert summary["average"] == 4.0
    assert summary["count"] == 4
    by = {row["category"]: row for row in summary["by_category"]}
    assert by["cleaning"] == {"category": "cleaning", "average": 5.0, "count": 3}
    assert by["fronts_signage"]["average"] == 1.0


def test_aggregate_uncategorized_bucket():
    summary = aggregate_quality_ratings([(None, 4), ("orders", 2)])
    by = {row["category"]: row for row in summary["by_category"]}
    assert by["other"]["average"] == 4.0
    assert by["orders"]["count"] == 1
