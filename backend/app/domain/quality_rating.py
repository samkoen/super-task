"""Notes 1–5 attribuées par le menahel à l'approbation d'une tâche."""

from __future__ import annotations

QUALITY_RATING_MIN = 1
QUALITY_RATING_MAX = 5
UNCATEGORIZED = "other"

_RATING_ERROR = "יש לבחור דירוג בין 1 ל-5"


def normalize_quality_rating(raw: object) -> int:
    try:
        value = int(raw)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        raise ValueError(_RATING_ERROR) from None
    if value < QUALITY_RATING_MIN or value > QUALITY_RATING_MAX:
        raise ValueError(_RATING_ERROR)
    return value


def _average(values: list[int]) -> float:
    return round(sum(values) / len(values), 1)


def empty_quality_summary() -> dict:
    return {"average": None, "count": 0, "by_category": []}


def aggregate_quality_ratings(rows: list[tuple[str | None, int]]) -> dict:
    """Moyenne globale (pondérée par le nombre de notes) + moyennes par catégorie."""
    if not rows:
        return empty_quality_summary()
    overall = [rating for _, rating in rows]
    by_cat: dict[str, list[int]] = {}
    for category, rating in rows:
        key = category or UNCATEGORIZED
        by_cat.setdefault(key, []).append(rating)
    by_category = [
        {"category": key, "average": _average(values), "count": len(values)}
        for key, values in sorted(by_cat.items())
    ]
    return {
        "average": _average(overall),
        "count": len(overall),
        "by_category": by_category,
    }
