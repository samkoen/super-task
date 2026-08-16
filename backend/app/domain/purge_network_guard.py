"""Garde-fous pour la purge d'une רשת (local vs production)."""
from __future__ import annotations


class PurgeGuardError(ValueError):
    pass


def names_match(typed: str, expected: str) -> bool:
    return typed.strip() == expected.strip()


def assert_can_purge(
    *,
    is_production: bool,
    dry_run: bool,
    yes: bool,
    confirm: bool,
    understand: bool,
    typed_name: str,
    expected_name: str,
) -> None:
    if dry_run:
        return
    if is_production:
        _assert_production(confirm, understand, typed_name, expected_name)
        return
    if yes:
        return
    if not names_match(typed_name, expected_name):
        raise PurgeGuardError("confirmation du nom de la reshet requise")


def _assert_production(
    confirm: bool, understand: bool, typed_name: str, expected_name: str
) -> None:
    if not confirm or not understand:
        raise PurgeGuardError(
            "production: --confirm et --i-understand-this-deletes-production requis"
        )
    if not names_match(typed_name, expected_name):
        raise PurgeGuardError("production: retapez le nom exact de la reshet")
