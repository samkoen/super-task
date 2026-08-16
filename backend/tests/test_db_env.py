"""is_production_target pour les scripts DB."""

from scripts._db_env import is_production_target


def test_neon_url_is_production(monkeypatch):
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    assert is_production_target("postgresql://u:p@ep-x.neon.tech/db")


def test_local_url_is_not_production(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    assert not is_production_target("postgresql://user:pass@localhost:5432/super_db")


def test_environment_production_flag(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    assert is_production_target("postgresql://user:pass@localhost:5432/super_db")
