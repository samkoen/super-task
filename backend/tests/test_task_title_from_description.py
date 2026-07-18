from app.domain.task_title_from_description import (
    fallback_title_from_description,
    parse_generated_title,
    resolve_create_title,
)


def test_resolve_keeps_explicit_title():
    assert resolve_create_title("  ניקוי  ", "desc") == "ניקוי"


def test_resolve_falls_back_to_description():
    assert resolve_create_title("", "שורה ראשונה\nשנייה") == "שורה ראשונה"


def test_resolve_requires_something():
    import pytest

    with pytest.raises(ValueError, match="כותרת או תיאור"):
        resolve_create_title("  ", "  ")


def test_parse_generated_title_strips_noise():
    assert parse_generated_title('  "סידור מקרר"  ', description="x") == "סידור מקרר"


def test_fallback_truncates():
    long = "א" * 100
    out = fallback_title_from_description(long, max_len=20)
    assert len(out) <= 20
    assert out.endswith("…")
