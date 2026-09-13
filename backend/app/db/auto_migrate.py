"""Alembic upgrade head au démarrage prod / Vercel."""
from __future__ import annotations

import logging
from pathlib import Path

from sqlalchemy import text

from app.db import session as db_session

logger = logging.getLogger(__name__)

_BACKEND_DIR = Path(__file__).resolve().parents[2]
_LOCK_KEY = 87451203


def should_auto_upgrade(*, is_production: bool, is_vercel: bool, database_url: str) -> bool:
    if not (is_production or is_vercel):
        return False
    return not (database_url or "").lower().startswith("sqlite")


def run_startup_migrations(*, is_production: bool, is_vercel: bool, database_url: str) -> None:
    if should_auto_upgrade(
        is_production=is_production,
        is_vercel=is_vercel,
        database_url=database_url,
    ):
        upgrade_to_head()


def upgrade_to_head() -> None:
    engine = db_session.get_engine()
    with engine.begin() as conn:
        _acquire_lock(conn)
        _run_alembic_upgrade()
    logger.info("Auto-migrate upgrade head done")


def _acquire_lock(conn) -> None:
    if conn.dialect.name != "postgresql":
        return
    # xact : fiable derrière PgBouncer / Neon pooled (session lock fuirait).
    conn.execute(text("SELECT pg_advisory_xact_lock(:k)"), {"k": _LOCK_KEY})


def _run_alembic_upgrade() -> None:
    from alembic import command
    from alembic.config import Config

    cfg = Config(str(_BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(_BACKEND_DIR / "alembic"))
    cfg.set_main_option("prepend_sys_path", str(_BACKEND_DIR))
    command.upgrade(cfg, "head")
