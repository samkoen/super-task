"""Efface TOUTES les données d'une רשת (tâches, ovdim, סניפים, la רשת elle-même).

Usage (depuis backend/) :
  python -m scripts.purge_reshet --name "ירקות" --dry-run
  python -m scripts.purge_reshet --name "ירקות" --yes

En production (Neon / ENVIRONMENT=production) :
  python -m scripts.purge_reshet --name "ירקות" \\
    --confirm --i-understand-this-deletes-production --type-name "ירקות"
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv

load_dotenv(backend_dir / ".env")

from app.db import session as db_session  # noqa: E402
from app.domain.purge_network_guard import PurgeGuardError, assert_can_purge  # noqa: E402
from app.repositories.network_repository import NetworkRepository  # noqa: E402
from app.services.purge_network_service import (  # noqa: E402
    PurgeCounts,
    preview_network_purge,
    purge_network,
)
from scripts._db_env import describe_database_url, is_production_target, resolve_database_url  # noqa: E402


def find_networks_by_exact_name(repo: NetworkRepository, name: str):
    needle = name.strip()
    return [n for n in repo.list_all() if n.name.strip() == needle]


def print_counts(counts: PurgeCounts) -> None:
    print("  notifications :", counts.notifications)
    print("  messages      :", counts.messages)
    print("  translations  :", counts.translations)
    print("  completions   :", counts.completions)
    print("  occurrences   :", counts.occurrences)
    print("  templates     :", counts.templates)
    print("  gallery       :", counts.gallery)
    print("  issues        :", counts.issues)
    print("  bamot         :", counts.stages)
    print("  products      :", counts.products)
    print("  departments   :", counts.departments)
    print("  invitations   :", counts.invitations)
    print("  users         :", counts.users)
    print("  branches      :", counts.branches)
    print("  networks      :", counts.networks)


def resolve_network(repo: NetworkRepository, *, network_id: str | None, name: str | None):
    if network_id:
        found = repo.find_by_id(network_id)
        if not found:
            print(f"Reshet introuvable pour --id {network_id}")
            sys.exit(1)
        return found
    assert name is not None
    matches = find_networks_by_exact_name(repo, name)
    if not matches:
        print(f'Reshet introuvable pour le nom exact "{name.strip()}".')
        sys.exit(1)
    if len(matches) > 1:
        print(f'Plusieurs reshet nommees "{name.strip()}". Passez --id.')
        for item in matches:
            print(f"  {item.id}  {item.name}")
        sys.exit(1)
    return matches[0]


def typed_name_or_prompt(expected: str, provided: str | None, *, skip_prompt: bool) -> str:
    if provided is not None:
        return provided
    if skip_prompt:
        return ""
    return input(f'Tapez le nom exact de la reshet pour confirmer ("{expected}"): ')


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Purge TOTALE d'une reshet (irreversible)."
    )
    ident = parser.add_mutually_exclusive_group(required=True)
    ident.add_argument("--name", help="Nom exact de la reshet")
    ident.add_argument("--id", dest="network_id", help="UUID de la reshet")
    parser.add_argument("--dry-run", action="store_true", help="Compter sans supprimer")
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Local uniquement : pas de confirmation interactive",
    )
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Obligatoire en production",
    )
    parser.add_argument(
        "--i-understand-this-deletes-production",
        dest="understand",
        action="store_true",
        help="Deuxieme confirmation obligatoire en production",
    )
    parser.add_argument(
        "--type-name",
        default=None,
        help="Nom retape (non interactif). En production, doit matcher le nom exact.",
    )
    return parser.parse_args(argv)


def _apply_purge(db, args, *, production: bool) -> None:
    network = resolve_network(
        NetworkRepository(db), network_id=args.network_id, name=args.name
    )
    print(f"Reshet: {network.name} ({network.id})")
    counts = preview_network_purge(db, network.id)
    print("Volumes a supprimer :")
    print_counts(counts)
    if args.dry_run:
        print("Dry-run : aucune suppression.")
        return
    typed = typed_name_or_prompt(
        network.name, args.type_name, skip_prompt=bool(args.yes) and not production
    )
    assert_can_purge(
        is_production=production,
        dry_run=False,
        yes=bool(args.yes),
        confirm=bool(args.confirm),
        understand=bool(args.understand),
        typed_name=typed,
        expected_name=network.name,
    )
    deleted = purge_network(db, network.id)
    db.commit()
    print("Supprime :")
    print_counts(deleted)
    print("OK.")


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    url = resolve_database_url()
    production = is_production_target(url)
    print(f"Target DB: {describe_database_url(url)}")
    if production:
        print("CIBLE PRODUCTION DETECTEE — la purge est irreversible.")
    db_session.reset_engine()
    db_session.get_engine()
    if db_session.SessionLocal is None:
        print("Impossible d'initialiser la session DB.")
        sys.exit(1)
    db = db_session.SessionLocal()
    try:
        _apply_purge(db, args, production=production)
    except PurgeGuardError as exc:
        db.rollback()
        print(f"Refuse : {exc}")
        sys.exit(1)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
