"""Règle pure : le serveur local recharge le code tout seul, jamais en production."""
from __future__ import annotations

from collections.abc import Mapping

_TRUE = {"1", "true", "yes"}
_FALSE = {"0", "false", "no"}


def should_reload(env: Mapping[str, str]) -> bool:
    """`UVICORN_RELOAD` gagne s'il est défini ; sinon actif seulement en développement local."""
    explicit = env.get("UVICORN_RELOAD", "").strip().lower()
    if explicit in _TRUE:
        return True
    if explicit in _FALSE:
        return False
    if env.get("RENDER"):
        return False
    return env.get("ENVIRONMENT", "development").strip().lower() == "development"
