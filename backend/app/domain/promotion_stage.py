"""Règles pures — במות מבצעים (Promotion Islands)."""

REFILL_STOCK_THRESHOLD_PCT = 30

SIGNAGE_OK = "ok"
SIGNAGE_NEEDS_UPDATE = "needs_update"


def needs_urgent_refill(stock_pct: float | int | None) -> bool:
    """Mise à jour urgente si stock scénique < 30 %."""
    if stock_pct is None:
        return False
    try:
        value = float(stock_pct)
    except (TypeError, ValueError):
        return False
    return value < REFILL_STOCK_THRESHOLD_PCT


def resolve_signage_status(*, price_matches: bool, signage_approved: bool) -> str:
    if price_matches and signage_approved:
        return SIGNAGE_OK
    return SIGNAGE_NEEDS_UPDATE


def can_create_refill_task(*, stock_pct: float | int | None, open_refill_exists: bool) -> bool:
    """Évite les doublons : une seule tâche refill ouverte par במה."""
    if open_refill_exists:
        return False
    return needs_urgent_refill(stock_pct)
