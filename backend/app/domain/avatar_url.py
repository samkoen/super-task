"""URL photo de profil (avatar)."""

MAX_AVATAR_URL = 1024


def normalize_avatar_url(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = str(value).strip()
    if not cleaned:
        return None
    if len(cleaned) > MAX_AVATAR_URL:
        raise ValueError("התמונה ארוכה מדי")
    lower = cleaned.lower()
    if any(lower.startswith(p) for p in ("javascript:", "data:", "file:")):
        raise ValueError("קישור לא חוקי")
    if lower.startswith("/uploads/avatars/"):
        return cleaned
    if lower.startswith("https://") or lower.startswith("http://"):
        return cleaned
    raise ValueError("תמונה לא תקינה")
