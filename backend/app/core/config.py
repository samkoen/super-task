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

_DEFAULT_SECRET = "dev-secret-key-change-in-production"
SECRET_KEY = os.environ.get("SECRET_KEY", _DEFAULT_SECRET)
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
APP_NAME = os.environ.get("APP_NAME", "Super")
ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT == "production" or IS_VERCEL

# Origines CORS (web + Capacitor). En local, regex pour IP LAN (téléphone → Vite).
_CORS_DEFAULT = [
    FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "capacitor://localhost",
    "https://localhost",
    "http://localhost",
]
_CORS_EXTRA = [
    o.strip()
    for o in os.environ.get("CORS_EXTRA_ORIGINS", "").split(",")
    if o.strip()
]
CORS_ALLOW_ORIGINS = list(dict.fromkeys([*_CORS_DEFAULT, *_CORS_EXTRA]))
CORS_ALLOW_ORIGIN_REGEX = (
    None
    if IS_PRODUCTION
    else r"https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?"
)
LOG_LEVEL = os.environ.get(
    "LOG_LEVEL",
    "DEBUG" if ENVIRONMENT == "development" and not IS_VERCEL else "INFO",
).strip().upper()

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

# --- Médias (Vercel Blob + rétention) ---
BLOB_READ_WRITE_TOKEN = os.environ.get("BLOB_READ_WRITE_TOKEN", "").strip()
# Doit correspondre au store Vercel : "private" (défaut) ou "public"
_BLOB_ACCESS_RAW = os.environ.get("BLOB_ACCESS", "private").strip().lower()
BLOB_ACCESS = _BLOB_ACCESS_RAW if _BLOB_ACCESS_RAW in {"private", "public"} else "private"
MEDIA_RETENTION_HOURS = int(os.environ.get("MEDIA_RETENTION_HOURS", "24"))
MEDIA_PHOTO_MAX_EDGE_PX = int(os.environ.get("MEDIA_PHOTO_MAX_EDGE_PX", "1280"))
MEDIA_PHOTO_QUALITY = int(os.environ.get("MEDIA_PHOTO_QUALITY", "65"))
CRON_SECRET = os.environ.get("CRON_SECRET", "").strip()


def blob_storage_enabled() -> bool:
    return bool(BLOB_READ_WRITE_TOKEN)


def assert_secure_runtime_config() -> None:
    """Refuse de démarrer en prod avec des secrets / stockage dangereux."""
    if not IS_PRODUCTION:
        return
    if SECRET_KEY == _DEFAULT_SECRET or len(SECRET_KEY) < 24:
        raise RuntimeError(
            "SECRET_KEY must be set to a strong value in production/Vercel "
            "(min 24 chars, not the default)."
        )
    if not blob_storage_enabled():
        raise RuntimeError(
            "BLOB_READ_WRITE_TOKEN is required on Vercel/production "
            "(ephemeral /tmp uploads are not allowed)."
        )


# --- Fournisseur AI (gemini | opencode) ---
AI_PROVIDER = os.environ.get("AI_PROVIDER", "gemini").strip().lower()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash").strip()
GEMINI_TEMPERATURE = float(os.environ.get("GEMINI_TEMPERATURE", "0.3"))
GEMINI_MAX_OUTPUT_TOKENS = int(os.environ.get("GEMINI_MAX_OUTPUT_TOKENS", "2048"))
GEMINI_GENERATION_MAX_OUTPUT_TOKENS = int(
    os.environ.get("GEMINI_GENERATION_MAX_OUTPUT_TOKENS", "8192")
)
GEMINI_THINKING_BUDGET = int(os.environ.get("GEMINI_THINKING_BUDGET", "0"))
GEMINI_TIMEOUT_SECONDS = float(os.environ.get("GEMINI_TIMEOUT_SECONDS", "45"))
GEMINI_GENERATION_TIMEOUT_SECONDS = float(
    os.environ.get("GEMINI_GENERATION_TIMEOUT_SECONDS", "120")
)
GEMINI_FALLBACK_MODELS = os.environ.get(
    "GEMINI_FALLBACK_MODELS", "gemini-2.0-flash,gemini-2.5-flash-lite"
)
GEMINI_GENERATION_FALLBACK_MODELS = os.environ.get(
    "GEMINI_GENERATION_FALLBACK_MODELS", "gemini-2.0-flash,gemini-2.5-flash-lite"
)
GEMINI_RETRY_COUNT = int(os.environ.get("GEMINI_RETRY_COUNT", "2"))
GEMINI_RETRY_DELAY_SECONDS = float(os.environ.get("GEMINI_RETRY_DELAY_SECONDS", "2"))

OPENCODE_SERVER_URL = os.environ.get("OPENCODE_SERVER_URL", "").strip()
OPENCODE_SERVER_USERNAME = os.environ.get("OPENCODE_SERVER_USERNAME", "opencode").strip()
OPENCODE_SERVER_PASSWORD = os.environ.get("OPENCODE_SERVER_PASSWORD", "").strip()
OPENCODE_PROVIDER_ID = os.environ.get("OPENCODE_PROVIDER_ID", "opencode-go").strip()
OPENCODE_API_KEY = os.environ.get("OPENCODE_API_KEY", "").strip()
OPENCODE_API_BASE_URL = os.environ.get(
    "OPENCODE_API_BASE_URL", "https://opencode.ai/zen/go/v1"
).strip()
OPENCODE_MODEL_ID = os.environ.get("OPENCODE_MODEL_ID", "deepseek-v4-flash").strip()
OPENCODE_AGENT = os.environ.get("OPENCODE_AGENT", "build").strip()
OPENCODE_SESSION_TITLE = os.environ.get("OPENCODE_SESSION_TITLE", "super-ai-chat").strip()
OPENCODE_GENERATION_SESSION_TITLE = os.environ.get(
    "OPENCODE_GENERATION_SESSION_TITLE", "super-ai-generation"
).strip()
OPENCODE_TIMEOUT_SECONDS = float(os.environ.get("OPENCODE_TIMEOUT_SECONDS", "240"))
OPENCODE_RETRY_COUNT = int(os.environ.get("OPENCODE_RETRY_COUNT", "2"))
OPENCODE_RETRY_DELAY_SECONDS = float(os.environ.get("OPENCODE_RETRY_DELAY_SECONDS", "2"))

# Google Cloud — traduction + TTS employé (Translation API v2 + Text-to-Speech)
GOOGLE_CLOUD_API_KEY = os.environ.get("GOOGLE_CLOUD_API_KEY", "").strip()
GOOGLE_TRANSLATE_SOURCE = os.environ.get("GOOGLE_TRANSLATE_SOURCE", "he").strip()  # repli si langue auteur inconnue
GOOGLE_TRANSLATE_TIMEOUT_SECONDS = float(os.environ.get("GOOGLE_TRANSLATE_TIMEOUT_SECONDS", "30"))
GOOGLE_TTS_VOICE_HE = os.environ.get("GOOGLE_TTS_VOICE_HE", "he-IL-Wavenet-A").strip()
GOOGLE_TTS_VOICE_AR = os.environ.get("GOOGLE_TTS_VOICE_AR", "ar-XA-Wavenet-B").strip()
GOOGLE_TTS_VOICE_TH = os.environ.get("GOOGLE_TTS_VOICE_TH", "th-TH-Neural2-C").strip()
GOOGLE_TTS_VOICE_FR = os.environ.get("GOOGLE_TTS_VOICE_FR", "fr-FR-Neural2-A").strip()
GOOGLE_TTS_VOICE_EN = os.environ.get("GOOGLE_TTS_VOICE_EN", "en-US-Neural2-C").strip()
GOOGLE_TTS_AUDIO_ENCODING = os.environ.get("GOOGLE_TTS_AUDIO_ENCODING", "MP3").strip()
GOOGLE_TTS_SPEAKING_RATE = float(os.environ.get("GOOGLE_TTS_SPEAKING_RATE", "1.0"))
GOOGLE_TTS_PITCH = float(os.environ.get("GOOGLE_TTS_PITCH", "0.0"))
GOOGLE_TTS_TIMEOUT_SECONDS = float(os.environ.get("GOOGLE_TTS_TIMEOUT_SECONDS", "30"))
