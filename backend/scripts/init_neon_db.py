"""Initialise une base Neon vide : schéma ORM complet + stamp Alembic head.

Usage (depuis backend/, DATABASE_URL Neon dans .env) :
    .venv\\Scripts\\python.exe scripts\\init_neon_db.py

À utiliser à la place de « alembic upgrade head » sur une base vierge :
a001 crée déjà tout le schéma actuel via create_all, les migrations
incrémentales a002–a011 ciblent des bases ayant évolué étape par étape.
"""
from __future__ import annotations

import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv

load_dotenv(backend_dir / ".env")

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.db import models  # noqa: F401
from app.db.base import Base
from app.db import session as db_session
from scripts._db_env import describe_database_url, resolve_database_url


def main() -> None:
    url = resolve_database_url()
    print(f"Target DB: {describe_database_url(url)}")

    db_session.reset_engine()
    engine = db_session.get_engine()
    insp = inspect(engine)

    if not insp.has_table("users"):
        Base.metadata.create_all(bind=engine)
        print("Schema created (create_all).")
    else:
        print("Tables already present - skip create_all.")

    cfg = Config(str(backend_dir / "alembic.ini"))
    command.stamp(cfg, "head")
    print("Alembic stamp -> head")


if __name__ == "__main__":
    main()
