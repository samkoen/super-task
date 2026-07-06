"""Tests configuration Neon / Vercel."""
from app.core.config import prepare_database_url


def test_prepare_database_url_converts_postgres_scheme():
    raw = "postgres://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
    assert prepare_database_url(raw).startswith("postgresql://")


def test_prepare_database_url_keeps_postgresql_scheme():
    raw = "postgresql://user:pass@localhost:5432/super_db"
    assert prepare_database_url(raw) == raw
