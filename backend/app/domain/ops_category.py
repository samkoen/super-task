"""Catégories opérationnelles des tâches קבועות (KPI magasin)."""

CLEANING = "cleaning"
FRONTS_SIGNAGE = "fronts_signage"

ALL = {CLEANING, FRONTS_SIGNAGE}

KPI_CATEGORIES = (CLEANING, FRONTS_SIGNAGE)


def normalize_ops_category(value: str | None) -> str | None:
    """Retourne la catégorie valide ou None (vide / inconnu → None)."""
    if value is None:
        return None
    cleaned = str(value).strip().lower()
    if not cleaned:
        return None
    if cleaned not in ALL:
        raise ValueError("סוג משימה לא חוקי")
    return cleaned
