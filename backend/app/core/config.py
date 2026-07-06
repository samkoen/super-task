"""Configuration partagée (variables d'environnement)."""
import os

from dotenv import load_dotenv

_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
load_dotenv(os.path.join(_BACKEND_DIR, ".env"))

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
APP_NAME = os.environ.get("APP_NAME", "Super")

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
