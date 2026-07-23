"""Infra tests d'intégration : SQLite + sessions authentifiées."""
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
MGR_B_EMAIL = "chat.mgr.b@test.local"
EMP_B_EMAIL = "chat.emp.b@test.local"
UNVERIFIED_EMAIL = "unverified@test.local"


@pytest.fixture()
def sqlite_url(tmp_path: Path) -> str:
    return f"sqlite:///{(tmp_path / 'integration.db').as_posix()}"


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
    Base.metadata.create_all(db_session.get_engine())
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


def _create_user(
    db,
    *,
    email: str,
    role: str,
    language: str,
    network_id: str | None,
    branch_id: str | None,
    first_name: str,
    email_verified: bool = True,
):
    return UserRepository(db).create_user(
        email=email,
        password=PASSWORD,
        first_name=first_name,
        last_name="Test",
        role=role,
        email_verified=email_verified,
        network_id=network_id,
        branch_id=branch_id,
        preferred_language=language,
    )


def _seed_world(db) -> dict[str, str]:
    net = NetworkRepository(db).create(name="Test Net")
    branch = BranchRepository(db).create(
        network_id=net.id,
        name="Branch A",
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
    db.commit()
    return {
        "network_id": net.id,
        "branch_id": branch.id,
        "manager_id": mgr.id,
        "employee_id": emp.id,
    }


@pytest.fixture()
def world_seed(app_env) -> dict[str, str]:
    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        return _seed_world(db)
    finally:
        db.close()


@pytest.fixture()
def chat_seed(world_seed) -> dict[str, str]:
    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        occ = TaskOccurrenceRepository(db).create(
            template_id=None,
            branch_id=world_seed["branch_id"],
            title="משימת צ'אט",
            description="",
            due_at=datetime.now(TZ) + timedelta(hours=2),
            assignee_user_id=world_seed["employee_id"],
            department_id=None,
            status=task_status.IN_PROGRESS,
            task_kind="ad_hoc",
            manager_user_id=world_seed["manager_id"],
            created_by_id=world_seed["manager_id"],
        )
        db.commit()
        return {**world_seed, "occurrence_id": occ.id}
    finally:
        db.close()


@pytest.fixture()
def second_branch_seed(world_seed) -> dict[str, str]:
    """Branche B + manager/employé isolés (même réseau)."""
    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        branch_b = BranchRepository(db).create(
            network_id=world_seed["network_id"],
            name="Branch B",
            address="",
            city="",
            postal_code="",
        )
        mgr_b = _create_user(
            db,
            email=MGR_B_EMAIL,
            role=roles.BRANCH_MANAGER,
            language="he",
            network_id=world_seed["network_id"],
            branch_id=branch_b.id,
            first_name="MgrB",
        )
        emp_b = _create_user(
            db,
            email=EMP_B_EMAIL,
            role=roles.EMPLOYEE,
            language="he",
            network_id=world_seed["network_id"],
            branch_id=branch_b.id,
            first_name="EmpB",
        )
        db.commit()
        return {
            **world_seed,
            "branch_b_id": branch_b.id,
            "manager_b_id": mgr_b.id,
            "employee_b_id": emp_b.id,
        }
    finally:
        db.close()


def login_client(app, email: str) -> TestClient:
    client = TestClient(app)
    response = client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return client


@pytest.fixture()
def client_emp(app, world_seed) -> TestClient:
    return login_client(app, EMP_EMAIL)


@pytest.fixture()
def client_mgr(app, world_seed) -> TestClient:
    return login_client(app, MGR_EMAIL)


@pytest.fixture()
def occurrence_id(chat_seed) -> str:
    return chat_seed["occurrence_id"]


@pytest.fixture()
def mock_i18n(monkeypatch: pytest.MonkeyPatch):
    """Traduction / transcription déterministes (chat)."""

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


def due_at_iso(hours: int = 2) -> str:
    return (datetime.now(TZ) + timedelta(hours=hours)).isoformat()
