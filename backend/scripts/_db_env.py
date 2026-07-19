"""Helpers partagés pour les scripts d'admin DB (même logique qu'alembic/env.py)."""
from __future__ import annotations

import os
from urllib.parse import urlparse


def resolve_database_url() -> str:
    """Comme alembic/env.get_url : UNPOOLED si présent, sinon DATABASE_URL."""
    unpooled = (os.environ.get("DATABASE_URL_UNPOOLED") or "").strip()
    pooled = (os.environ.get("DATABASE_URL") or "").strip()
    chosen = unpooled or pooled
    if not chosen:
        raise RuntimeError(
            "DATABASE_URL manquant. Crée backend/.env avec "
            "DATABASE_URL=postgresql://USER:MDP@localhost:5432/super_db"
        )
    # Les scripts / SQLAlchemy app lisent DATABASE_URL — aligne si on a choisi UNPOOLED.
    if unpooled:
        os.environ["DATABASE_URL"] = unpooled
    _warn_if_urls_disagree(pooled, unpooled)
    return chosen


def describe_database_url(url: str) -> str:
    p = urlparse(url)
    host = p.hostname or "?"
    db = (p.path or "/").lstrip("/") or "?"
    return f"{host}/{db}"


def _warn_if_urls_disagree(pooled: str, unpooled: str) -> None:
    if not pooled or not unpooled:
        return
    h1 = (urlparse(pooled).hostname or "").lower()
    h2 = (urlparse(unpooled).hostname or "").lower()
    if h1 and h2 and h1 != h2:
        print(
            "ATTENTION: DATABASE_URL et DATABASE_URL_UNPOOLED pointent vers des hotes differents:\n"
            f"  DATABASE_URL          -> {describe_database_url(pooled)}\n"
            f"  DATABASE_URL_UNPOOLED -> {describe_database_url(unpooled)}\n"
            "  Les scripts utilisent UNPOOLED (comme Alembic). "
            "Pour le dev local, commente DATABASE_URL_UNPOOLED."
        )


# Alias historique
prefer_unpooled_database_url = resolve_database_url
