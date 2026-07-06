import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import IS_SERVERLESS, prepare_database_url

_engine = None
SessionLocal: sessionmaker[Session] | None = None


def reset_engine() -> None:
    global _engine, SessionLocal
    if _engine is not None:
        _engine.dispose()
    _engine = None
    SessionLocal = None


def get_engine():
    global _engine, SessionLocal
    if _engine is not None:
        return _engine
    raw_url = os.environ.get("DATABASE_URL")
    if not raw_url:
        raise RuntimeError("DATABASE_URL is not set (e.g. in backend/.env)")
    url = prepare_database_url(raw_url)

    connect_args: dict = {}
    try:
        u = make_url(url)
        if u.drivername.startswith("postgresql"):
            connect_args["connect_timeout"] = int(
                os.environ.get("PG_CONNECT_TIMEOUT", "10")
            )
            host = (u.host or "").lower()
            if host.endswith(".neon.tech") and "sslmode" not in (u.query or ""):
                connect_args["sslmode"] = "require"
    except Exception:
        pass

    eng_kw: dict = {
        "echo": os.environ.get("SQL_ECHO", "").lower() in ("1", "true", "yes"),
        "pool_pre_ping": True,
    }
    if connect_args:
        eng_kw["connect_args"] = connect_args
    if IS_SERVERLESS:
        eng_kw["poolclass"] = NullPool
    else:
        eng_kw["pool_recycle"] = 280

    _engine = create_engine(url, **eng_kw)
    SessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=_engine, expire_on_commit=False
    )
    return _engine


def get_db() -> Generator[Session, None, None]:
    if SessionLocal is None:
        get_engine()
    assert SessionLocal is not None
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
