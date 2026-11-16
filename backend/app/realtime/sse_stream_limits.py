"""Limites optionnelles du stream SSE (None = pas de plafond)."""


def stream_max_seconds() -> int | None:
    """None = pas de plafond (processus long-running)."""
    return None


def stream_time_is_up(started_at: float, now: float, max_seconds: int | None) -> bool:
    if not max_seconds:
        return False
    return (now - started_at) >= max_seconds
