"""Auto-migrate au démarrage : garde-fous env + upgrade mocké."""
from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.db.auto_migrate import run_startup_migrations, should_auto_upgrade, upgrade_to_head


def test_should_auto_upgrade_skips_local_dev():
    assert not should_auto_upgrade(
        is_production=False,
        is_vercel=False,
        database_url="postgresql://u:p@localhost/super_db",
    )


def test_should_auto_upgrade_skips_sqlite_even_on_vercel():
    assert not should_auto_upgrade(
        is_production=True,
        is_vercel=True,
        database_url="sqlite:///:memory:",
    )


def test_should_auto_upgrade_on_vercel_postgres():
    assert should_auto_upgrade(
        is_production=False,
        is_vercel=True,
        database_url="postgresql://u:p@ep-x.neon.tech/db",
    )


def test_should_auto_upgrade_on_production_postgres():
    assert should_auto_upgrade(
        is_production=True,
        is_vercel=False,
        database_url="postgresql+psycopg://u:p@db/super",
    )


def test_run_startup_migrations_skips_when_not_enabled(monkeypatch):
    called = []
    monkeypatch.setattr("app.db.auto_migrate.upgrade_to_head", lambda: called.append(1))
    run_startup_migrations(
        is_production=False,
        is_vercel=False,
        database_url="postgresql://u:p@localhost/super_db",
    )
    assert called == []


def test_run_startup_migrations_upgrades_when_enabled(monkeypatch):
    called = []
    monkeypatch.setattr("app.db.auto_migrate.upgrade_to_head", lambda: called.append(1))
    run_startup_migrations(
        is_production=True,
        is_vercel=True,
        database_url="postgresql://u:p@ep-x.neon.tech/db",
    )
    assert called == [1]


def test_upgrade_to_head_runs_alembic_under_lock(monkeypatch):
    conn = MagicMock()
    conn.dialect.name = "postgresql"
    engine = MagicMock()
    engine.begin.return_value.__enter__.return_value = conn
    engine.begin.return_value.__exit__.return_value = False
    monkeypatch.setattr("app.db.auto_migrate.db_session.get_engine", lambda: engine)
    monkeypatch.setattr("app.db.auto_migrate._schema_is_at_head", lambda: False)
    monkeypatch.setattr("app.db.auto_migrate._run_alembic_upgrade", lambda: None)

    upgrade_to_head()

    sql = str(conn.execute.call_args.args[0])
    assert "pg_advisory_xact_lock" in sql


def test_upgrade_to_head_skips_when_already_at_head(monkeypatch):
    called = []
    monkeypatch.setattr("app.db.auto_migrate._schema_is_at_head", lambda: True)
    monkeypatch.setattr(
        "app.db.auto_migrate._run_alembic_upgrade", lambda: called.append(1)
    )
    monkeypatch.setattr("app.db.auto_migrate.db_session.get_engine", lambda: called.append("engine"))

    upgrade_to_head()

    assert called == []


def test_upgrade_to_head_propagates_alembic_failure(monkeypatch):
    conn = MagicMock()
    conn.dialect.name = "postgresql"
    engine = MagicMock()
    engine.begin.return_value.__enter__.return_value = conn
    engine.begin.return_value.__exit__.return_value = False
    monkeypatch.setattr("app.db.auto_migrate.db_session.get_engine", lambda: engine)
    monkeypatch.setattr("app.db.auto_migrate._schema_is_at_head", lambda: False)

    def boom() -> None:
        raise RuntimeError("alembic failed")

    monkeypatch.setattr("app.db.auto_migrate._run_alembic_upgrade", boom)

    with pytest.raises(RuntimeError, match="alembic failed"):
        upgrade_to_head()


def test_run_alembic_upgrade_calls_head(monkeypatch):
    from alembic import command

    seen: dict[str, object] = {}

    def fake_upgrade(cfg, rev: str) -> None:
        seen["rev"] = rev
        seen["script"] = cfg.get_main_option("script_location")

    monkeypatch.setattr(command, "upgrade", fake_upgrade)
    from app.db import auto_migrate

    auto_migrate._run_alembic_upgrade()
    assert seen["rev"] == "head"
    assert str(seen["script"]).endswith("alembic")
