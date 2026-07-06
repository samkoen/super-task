"""Configuration Brevo — variables d'environnement."""

from __future__ import annotations

from app.core import config


def brevo_api_key() -> str | None:
    v = (config.BREVO_API_KEY or "").strip()
    return v or None


def brevo_sender_email() -> str | None:
    v = (config.BREVO_SENDER_EMAIL or "").strip()
    return v or None


def brevo_sender_name() -> str:
    v = (config.BREVO_SENDER_NAME or "").strip()
    return v or config.APP_NAME


def brevo_force_simulation() -> bool:
    return config.BREVO_USE_SIMULATION


def brevo_credentials_ok() -> bool:
    return bool(brevo_api_key() and brevo_sender_email())


def brevo_sandbox_recipient() -> str:
    return (config.BREVO_SANDBOX_RECIPIENT or "").strip()


def brevo_is_configured() -> bool:
    return brevo_credentials_ok() and not brevo_force_simulation()
