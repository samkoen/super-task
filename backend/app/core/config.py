"""Configuration partagée (variables d'environnement)."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_PROJECT_DIR = _BACKEND_DIR.parent
load_dotenv(_BACKEND_DIR / ".env")
load_dotenv(_PROJECT_DIR / ".env")

IS_VERCEL = bool(os.environ.get("VERCEL"))
IS_SERVERLESS = IS_VERCEL or bool(os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
APP_NAME = os.environ.get("APP_NAME", "Super")
ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")

COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "true" if IS_VERCEL else "false").lower() in (
    "1",
    "true",
    "yes",
)

BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.environ.get("BREVO_SENDER_EMAIL", "")
BREVO_SENDER_NAME = os.environ.get("BREVO_SENDER_NAME", APP_NAME)
BREVO_USE_SIMULATION = os.environ.get("BREVO_USE_SIMULATION", "true").lower() in (
    "1",
    "true",
    "yes",
)
BREVO_SANDBOX_RECIPIENT = os.environ.get("BREVO_SANDBOX_RECIPIENT", "")
EMAIL_VERIFY_EXPIRE_HOURS = int(os.environ.get("EMAIL_VERIFY_EXPIRE_HOURS", "48"))
INVITE_EXPIRE_HOURS = int(os.environ.get("INVITE_EXPIRE_HOURS", "168"))
PASSWORD_MIN_LENGTH = int(os.environ.get("PASSWORD_MIN_LENGTH", "6"))


def prepare_database_url(raw: str) -> str:
    """Normalise l'URL PostgreSQL pour SQLAlchemy/psycopg2 (Neon, Vercel, etc.)."""
    url = raw.strip()
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


def uploads_dir() -> Path:
    """Répertoire des fichiers uploadés — /tmp sur Vercel (FS éphémère)."""
    override = os.environ.get("UPLOADS_DIR", "").strip()
    if override:
        return Path(override)
    if IS_VERCEL:
        return Path("/tmp/super_uploads")
    return _BACKEND_DIR / "uploads"


UPLOADS_DIR = uploads_dir()
