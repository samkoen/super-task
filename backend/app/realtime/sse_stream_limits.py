"""Limites du stream SSE — Vercel tue l'invocation à maxDuration (120s)."""

VERCEL_STREAM_MAX_SECONDS = 90


def stream_max_seconds(*, is_vercel: bool) -> int | None:
    """None = pas de plafond (uvicorn local)."""
    if is_vercel:
        return VERCEL_STREAM_MAX_SECONDS
    return None


def stream_time_is_up(started_at: float, now: float, max_seconds: int | None) -> bool:
    if not max_seconds:
        return False
    return (now - started_at) >= max_seconds
