"""Configuration GitHub Issues — variables d'environnement."""

from __future__ import annotations

from app.core import config


def github_token() -> str | None:
    value = (config.GITHUB_TOKEN or "").strip()
    return value or None


def github_repo() -> str:
    return (config.GITHUB_REPO or "").strip()


def github_repo_parts() -> tuple[str, str] | None:
    raw = github_repo()
    if raw.count("/") != 1:
        return None
    owner, name = raw.split("/", 1)
    owner, name = owner.strip(), name.strip()
    if not owner or not name:
        return None
    return owner, name


def github_issue_labels() -> list[str]:
    return [part.strip() for part in (config.GITHUB_ISSUE_LABELS or "").split(",") if part.strip()]


def github_issues_enabled() -> bool:
    return bool(github_token() and github_repo_parts())
