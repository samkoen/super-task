"""Infra tests d'intégration : SQLite + 2 sessions (employé / manager)."""
from __future__ import annotations

import io
import os
from collections.abc import Generator
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

# Avant tout import app.* : éviter create_app() module-level en mode prod/.env.
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-integration-tests")
os.environ.setdefault("COOKIE_SECURE", "false")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ["BLOB_READ_WRITE_TOKEN"] = ""
os.environ.pop("VERCEL", None)

import pytest
from fastapi.testclient import TestClient
from PIL import Image

import app.core.config as config
import app.db.session as db_session
from app.db.models import Base
from app.dependencies import get_db
from app.domain import roles, task_status
from app.main import create_app
from app.repositories.branch_repository import BranchRepository
from app.repositories.network_repository import NetworkRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.user_repository import UserRepository

TZ = ZoneInfo("Asia/Jerusalem")
PASSWORD = "ChatTest123!"
MGR_EMAIL = "chat.mgr@test.local"
EMP_EMAIL = "chat.emp@test.local"


@pytest.fixture()
def sqlite_url(tmp_path: Path) -> str:
    return f"sqlite:///{(tmp_path / 'chat_integration.db').as_posix()}"


@pytest.fixture()
def uploads_dir(tmp_path: Path) -> Path:
    path = tmp_path / "uploads"
    path.mkdir()
    return path


@pytest.fixture()
def app_env(monkeypatch: pytest.MonkeyPatch, sqlite_url: str, uploads_dir: Path):
    monkeypatch.setenv("DATABASE_URL", sqlite_url)
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-for-integration-tests")
    monkeypatch.setenv("COOKIE_SECURE", "false")
    monkeypatch.setenv("BLOB_READ_WRITE_TOKEN", "")
    monkeypatch.setenv("UPLOADS_DIR", str(uploads_dir))
    monkeypatch.delenv("VERCEL", raising=False)
    monkeypatch.setattr(config, "IS_PRODUCTION", False)
    monkeypatch.setattr(config, "IS_VERCEL", False)
    monkeypatch.setattr(config, "COOKIE_SECURE", False)
    monkeypatch.setattr(config, "BLOB_READ_WRITE_TOKEN", "")
    monkeypatch.setattr(config, "UPLOADS_DIR", uploads_dir)
    monkeypatch.setattr("app.main.UPLOADS_DIR", uploads_dir)
    monkeypatch.setattr("app.services.blob_storage.UPLOADS_DIR", uploads_dir)
    db_session.reset_engine()
    engine = db_session.get_engine()
    Base.metadata.create_all(engine)
    yield
    db_session.reset_engine()


def _override_get_db() -> Generator:
    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@pytest.fixture()
def app(app_env):
    application = create_app()
    application.dependency_overrides[get_db] = _override_get_db
    yield application
    application.dependency_overrides.clear()


@pytest.fixture()
def chat_seed(app_env) -> dict[str, str]:
    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        return _seed_chat_world(db)
    finally:
        db.close()


def _seed_chat_world(db) -> dict[str, str]:
    net = NetworkRepository(db).create(name="Chat Net")
    branch = BranchRepository(db).create(
        network_id=net.id,
        name="Chat Branch",
        address="",
        city="",
        postal_code="",
    )
    mgr = _create_user(
        db,
        email=MGR_EMAIL,
        role=roles.BRANCH_MANAGER,
        language="he",
        network_id=net.id,
        branch_id=branch.id,
        first_name="Menahel",
    )
    emp = _create_user(
        db,
        email=EMP_EMAIL,
        role=roles.EMPLOYEE,
        language="th",
        network_id=net.id,
        branch_id=branch.id,
        first_name="Oved",
    )
    occ = TaskOccurrenceRepository(db).create(
        template_id=None,
        branch_id=branch.id,
        title="משימת צ'אט",
        description="",
        due_at=datetime.now(TZ) + timedelta(hours=2),
        assignee_user_id=emp.id,
        department_id=None,
        status=task_status.IN_PROGRESS,
        task_kind="ad_hoc",
        manager_user_id=mgr.id,
        created_by_id=mgr.id,
    )
    db.commit()
    return {
        "occurrence_id": occ.id,
        "manager_id": mgr.id,
        "employee_id": emp.id,
        "branch_id": branch.id,
        "network_id": net.id,
    }


def _create_user(db, *, email, role, language, network_id, branch_id, first_name):
    return UserRepository(db).create_user(
        email=email,
        password=PASSWORD,
        first_name=first_name,
        last_name="Chat",
        role=role,
        email_verified=True,
        network_id=network_id,
        branch_id=branch_id,
        preferred_language=language,
    )


def _login(client: TestClient, email: str) -> None:
    response = client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text


@pytest.fixture()
def client_emp(app, chat_seed) -> TestClient:
    client = TestClient(app)
    _login(client, EMP_EMAIL)
    return client


@pytest.fixture()
def client_mgr(app, chat_seed) -> TestClient:
    client = TestClient(app)
    _login(client, MGR_EMAIL)
    return client


@pytest.fixture()
def occurrence_id(chat_seed) -> str:
    return chat_seed["occurrence_id"]


@pytest.fixture()
def mock_i18n(monkeypatch: pytest.MonkeyPatch):
    """Traduction / transcription déterministes (pas d'API externes)."""

    async def localize(text: str, *, source_language: str, target_language: str) -> str:
        return f"{text}->{target_language}"

    async def transcribe(audio_url: str, *, manager_language: str) -> str:
        return f"transcript-{manager_language}"

    monkeypatch.setattr(
        "app.services.task_message_service.localize_completion_transcript",
        localize,
    )
    monkeypatch.setattr(
        "app.services.task_message_service.transcribe_completion_audio",
        transcribe,
    )


@pytest.fixture()
def jpeg_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (32, 32), (40, 120, 200)).save(buf, format="JPEG")
    return buf.getvalue()
