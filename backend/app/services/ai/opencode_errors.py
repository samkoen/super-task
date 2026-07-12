"""Erreurs et profils d'exécution OpenCode Go."""
from __future__ import annotations


class OpenCodeError(Exception):
    def __init__(self, message: str, *, retryable: bool = True) -> None:
        super().__init__(message)
        self.retryable = retryable


_GENERATION_SYSTEM = (
    "You assist supermarket operations staff. "
    "Reply as the Assistant only. Text only, no tools."
)


def generation_system() -> str:
    return _GENERATION_SYSTEM


def run_profile(*, for_generation: bool) -> dict[str, str | float]:
    from app.core import config

    timeout = config.OPENCODE_TIMEOUT_SECONDS
    if for_generation:
        return {
            "model_id": config.OPENCODE_MODEL_ID,
            "agent": config.OPENCODE_AGENT,
            "session_title": config.OPENCODE_GENERATION_SESSION_TITLE,
            "timeout": timeout,
        }
    return {
        "model_id": config.OPENCODE_MODEL_ID,
        "agent": config.OPENCODE_AGENT,
        "session_title": config.OPENCODE_SESSION_TITLE,
        "timeout": timeout,
    }
