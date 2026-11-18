"""Recrée la base des tests e2e (Playwright) puis y met un petit monde de test.

Utilisé par e2e/playwright.config.ts juste avant de lancer l'API.
Refuse toute base qui n'est pas locale ou dont le nom ne finit pas par `_e2e` :
super_db (dev) et la prod Neon ne peuvent jamais être touchées.

    DATABASE_URL=postgresql://postgres:MDP@127.0.0.1:5432/super_e2e python scripts/e2e_reset_db.py
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.engine.url import make_url  # noqa: E402

TZ = ZoneInfo("Asia/Jerusalem")
_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}

# Doit rester aligné avec e2e/fixtures/world.ts
PASSWORD = "E2eTest123!"
MANAGER_EMAIL = "e2e.menahel@test.local"
EMPLOYEE_EMAIL = "e2e.oved@test.local"
SEEDED_TASK_TITLE = "משימת בדיקה e2e"


def _check_target(raw_url: str):
    url = make_url(raw_url)
    host = (url.host or "").lower()
    db_name = url.database or ""
    if host not in _LOCAL_HOSTS:
        sys.exit(f"Refus : la base e2e doit être locale (host={host!r}).")
    if not db_name.endswith("_e2e"):
        sys.exit(f"Refus : le nom de la base e2e doit finir par _e2e (db={db_name!r}).")
    return url


def _recreate_database(url) -> None:
    admin_url = url.set(database="postgres")
    engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    name = url.database
    with engine.connect() as conn:
        conn.execute(
            text(
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                "WHERE datname = :name AND pid <> pg_backend_pid()"
            ),
            {"name": name},
        )
        conn.execute(text(f'DROP DATABASE IF EXISTS "{name}"'))
        conn.execute(text(f'CREATE DATABASE "{name}"'))
    engine.dispose()


def _migrate() -> None:
    """Schéma depuis les modèles (comme les tests d'intégration), puis stamp head.

    `alembic upgrade head` sur une base vierge échoue : une ancienne migration
    ajoute une colonne déjà créée plus tôt dans la chaîne.
    """
    from alembic import command

    from app.db import session as db_session
    from app.db.auto_migrate import _alembic_config
    from app.db.models import Base

    db_session.reset_engine()
    Base.metadata.create_all(db_session.get_engine())
    db_session.reset_engine()
    command.stamp(_alembic_config(), "head")


def _due_today() -> datetime:
    now = datetime.now(TZ)
    end_of_day = now.replace(hour=23, minute=59, second=0, microsecond=0)
    return min(now + timedelta(hours=1), end_of_day)


def _seed() -> dict[str, str]:
    from app.db import session as db_session
    from app.domain import roles, task_status
    from app.repositories.branch_repository import BranchRepository
    from app.repositories.network_repository import NetworkRepository
    from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
    from app.repositories.user_repository import UserRepository

    db_session.reset_engine()
    db_session.get_engine()
    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        net = NetworkRepository(db).create(name="רשת e2e")
        branch = BranchRepository(db).create(
            network_id=net.id, name="סניף e2e", address="", city="", postal_code=""
        )
        users = UserRepository(db)
        mgr = users.create_user(
            email=MANAGER_EMAIL,
            password=PASSWORD,
            first_name="מנהל",
            last_name="בדיקה",
            role=roles.BRANCH_MANAGER,
            email_verified=True,
            network_id=net.id,
            branch_id=branch.id,
            preferred_language="he",
        )
        emp = users.create_user(
            email=EMPLOYEE_EMAIL,
            password=PASSWORD,
            first_name="עובד",
            last_name="בדיקה",
            role=roles.EMPLOYEE,
            email_verified=True,
            network_id=net.id,
            branch_id=branch.id,
            preferred_language="he",
        )
        occ = TaskOccurrenceRepository(db).create(
            template_id=None,
            branch_id=branch.id,
            title=SEEDED_TASK_TITLE,
            description="",
            due_at=_due_today(),
            assignee_user_id=emp.id,
            department_id=None,
            status=task_status.PENDING,
            task_kind="ad_hoc",
            manager_user_id=mgr.id,
            created_by_id=mgr.id,
        )
        db.commit()
        return {
            "network_id": net.id,
            "branch_id": branch.id,
            "manager_id": mgr.id,
            "employee_id": emp.id,
            "seeded_task_id": occ.id,
        }
    finally:
        db.close()
        db_session.reset_engine()


def main() -> None:
    raw = (os.environ.get("DATABASE_URL") or "").strip()
    if not raw:
        sys.exit("DATABASE_URL manquant (base e2e).")
    os.environ.pop("DATABASE_URL_UNPOOLED", None)
    url = _check_target(raw)
    _recreate_database(url)
    _migrate()
    world = _seed()
    print("E2E_WORLD " + json.dumps(world))


if __name__ == "__main__":
    main()
