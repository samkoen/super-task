"""Erreurs Google Cloud (Translation / TTS)."""
from __future__ import annotations


class GoogleCloudError(Exception):
    def __init__(self, message: str, *, retryable: bool = True) -> None:
        super().__init__(message)
        self.retryable = retryable
