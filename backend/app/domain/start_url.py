"""URL ouverte au démarrage d'une tâche (ex. הזמנה Agroline)."""

MAX_START_URL = 1024


def normalize_start_url(value: str | None) -> str | None:
    """http(s) only. Vide → None. Sinon ValueError."""
    if value is None:
        return None
    cleaned = str(value).strip()
    if not cleaned:
        return None
    if len(cleaned) > MAX_START_URL:
        raise ValueError("הקישור ארוך מדי")
    lower = cleaned.lower()
    if not (lower.startswith("https://") or lower.startswith("http://")):
        raise ValueError("הקישור חייב להתחיל ב-https://")
    if any(lower.startswith(p) for p in ("javascript:", "data:", "file:")):
        raise ValueError("קישור לא חוקי")
    return cleaned
