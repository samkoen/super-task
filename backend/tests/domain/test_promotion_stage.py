"""Tests unitaires — règles במות מבצעים."""

from app.domain.promotion_stage import (
    REFILL_STOCK_THRESHOLD_PCT,
    can_create_refill_task,
    needs_urgent_refill,
    resolve_signage_status,
)


def test_needs_urgent_refill_below_threshold():
    assert needs_urgent_refill(29) is True
    assert needs_urgent_refill(REFILL_STOCK_THRESHOLD_PCT) is False
    assert needs_urgent_refill(75) is False


def test_needs_urgent_refill_invalid():
    assert needs_urgent_refill(None) is False
    assert needs_urgent_refill("x") is False  # type: ignore[arg-type]


def test_can_create_refill_task_avoids_duplicates():
    assert can_create_refill_task(stock_pct=20, open_refill_exists=False) is True
    assert can_create_refill_task(stock_pct=20, open_refill_exists=True) is False
    assert can_create_refill_task(stock_pct=50, open_refill_exists=False) is False


def test_resolve_signage_status():
    assert resolve_signage_status(price_matches=True, signage_approved=True) == "ok"
    assert resolve_signage_status(price_matches=False, signage_approved=True) == "needs_update"
