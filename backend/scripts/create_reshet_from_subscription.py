"""Crée une רשת + מנהל רשת + סניפים + עובדים depuis new_reshet_subscription.txt.

Usage (depuis backend/) :
  python -m scripts.create_reshet_from_subscription
  python -m scripts.create_reshet_from_subscription --file ../new_reshet_subscription.txt

Mot de passe fixe : 123456 (tous les comptes, email_verified=True).
Login = numéro de téléphone (מנהל רשת et ovdim). Un même téléphone sur 2 סניפים = un seul compte multi-snif.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv

load_dotenv(backend_dir / ".env")

from scripts._db_env import describe_database_url, resolve_database_url  # noqa: E402
from app.db import session as db_session  # noqa: E402
from app.domain import job_functions, roles  # noqa: E402
from app.domain.new_reshet_subscription import (  # noqa: E402
    ReshetSubscription,
    SubscriptionOved,
    oved_login,
    ovdim_with_snifim,
    parse_subscription_text,
    person_login,
    split_person_name,
)
from app.repositories.branch_repository import BranchRepository  # noqa: E402
from app.repositories.network_repository import NetworkRepository  # noqa: E402
from app.repositories.user_branch_membership_repository import (  # noqa: E402
    UserBranchMembershipRepository,
)
from app.repositories.user_repository import UserRepository  # noqa: E402

DEFAULT_PASSWORD = "123456"
DEFAULT_FILE_NAMES = ("new_reshet_subscription.txt",)


def default_file_path() -> Path:
    repo_root = backend_dir.parent
    for name in DEFAULT_FILE_NAMES:
        for candidate in (repo_root / name, backend_dir / name, Path.cwd() / name):
            if candidate.is_file():
                return candidate
    return repo_root / DEFAULT_FILE_NAMES[0]


def find_network_by_name(repo: NetworkRepository, name: str):
    matches = [n for n in repo.list_all() if n.name.strip() == name.strip()]
    return matches[0] if matches else None


def find_branch_by_name(repo: BranchRepository, *, network_id: str, name: str):
    matches = [
        b
        for b in repo.list_branches(network_id=network_id)
        if b.name.strip() == name.strip()
    ]
    return matches[0] if matches else None


def ensure_user(
    repo: UserRepository,
    *,
    email: str,
    full_name: str,
    role: str,
    network_id: str | None,
    branch_id: str | None,
    job_function: str | None,
    phone: str | None = None,
) -> tuple[str, bool]:
    existing = repo.find_by_email(email)
    if existing:
        return existing.id, False
    first, last = split_person_name(full_name)
    user = repo.create_user(
        email=email,
        password=DEFAULT_PASSWORD,
        first_name=first,
        last_name=last,
        role=role,
        network_id=network_id,
        branch_id=branch_id,
        job_function=job_function,
        phone=phone,
        email_verified=True,
        preferred_language="he",
    )
    return user.id, True


def ensure_snif(branches: BranchRepository, *, network_id: str, name: str):
    branch = find_branch_by_name(branches, network_id=network_id, name=name)
    if branch:
        print(f"  snif exists: {branch.name}")
        return branch
    branch = branches.create(
        network_id=network_id, name=name, address="", city="", postal_code=""
    )
    print(f"  snif created: {branch.name}")
    return branch


def attach_oved_snifim(
    memberships: UserBranchMembershipRepository,
    *,
    user_id: str,
    branch_ids: list[str],
) -> None:
    if not branch_ids:
        return
    memberships.ensure_membership(user_id, branch_ids[0], is_primary=True)
    for bid in branch_ids[1:]:
        memberships.ensure_membership(user_id, bid, is_primary=False)


def ensure_oved(
    users: UserRepository,
    memberships: UserBranchMembershipRepository,
    *,
    oved: SubscriptionOved,
    login: str,
    network_id: str,
    branch_ids: list[str],
) -> tuple[str, bool]:
    primary = branch_ids[0]
    user_id, created = ensure_user(
        users,
        email=login,
        full_name=oved.name,
        role=roles.EMPLOYEE,
        network_id=network_id,
        branch_id=primary,
        job_function=job_functions.STOCKERS,
        phone=oved.phone,
    )
    attach_oved_snifim(memberships, user_id=user_id, branch_ids=branch_ids)
    return user_id, created


def apply_subscription(db, sub: ReshetSubscription) -> list[tuple[str, str, str]]:
    """Retourne les identifiants : (rôle, nom, login)."""
    networks = NetworkRepository(db)
    branches = BranchRepository(db)
    users = UserRepository(db)
    memberships = UserBranchMembershipRepository(db)
    creds: list[tuple[str, str, str]] = []

    network = find_network_by_name(networks, sub.reshet_name)
    if network:
        print(f"  reshet exists: {network.name}")
    else:
        network = networks.create(name=sub.reshet_name)
        print(f"  reshet created: {network.name}")

    mgr_login = person_login(
        name=sub.menahel_reshet, phone=sub.menahel_phone, role_tag="reshet", index=0
    )
    _, created = ensure_user(
        users,
        email=mgr_login,
        full_name=sub.menahel_reshet,
        role=roles.NETWORK_MANAGER,
        network_id=network.id,
        branch_id=None,
        job_function=None,
        phone=sub.menahel_phone,
    )
    creds.append(("מנהל רשת", sub.menahel_reshet, mgr_login))
    print(f"  menahel reshet {'created' if created else 'exists'}: {mgr_login}")

    branch_by_name = {
        snif.name: ensure_snif(branches, network_id=network.id, name=snif.name)
        for snif in sub.snifim
    }
    creds.extend(_apply_ovdim(users, memberships, network.id, branch_by_name, sub))
    return creds


def _apply_ovdim(users, memberships, network_id: str, branch_by_name: dict, sub) -> list:
    creds: list[tuple[str, str, str]] = []
    for index, (oved, snif_names) in enumerate(ovdim_with_snifim(sub.snifim), start=1):
        login = oved_login(oved, index=index)
        branch_ids = [branch_by_name[name].id for name in snif_names]
        _, created = ensure_oved(
            users,
            memberships,
            oved=oved,
            login=login,
            network_id=network_id,
            branch_ids=branch_ids,
        )
        label = " + ".join(snif_names)
        creds.append((f"עובד / {label}", oved.name, login))
        action = "created" if created else "exists"
        extra = f" +{len(snif_names) - 1} snif" if len(snif_names) > 1 else ""
        print(f"    oved {action}: {oved.name} -> {login}{extra}")
    return creds


def print_credentials(creds: list[tuple[str, str, str]]) -> None:
    print("\n--- identifiants (mot de passe: 123456) ---")
    for role, name, login in creds:
        print(f"{role:40} | {name:20} | {login}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Créer רשת + סניפים + עובדים depuis un .txt")
    parser.add_argument("--file", "-f", default=None, help="Chemin new_reshet_subscription.txt")
    args = parser.parse_args()
    path = Path(args.file) if args.file else default_file_path()
    if not path.is_file():
        print(f"Fichier introuvable: {path}")
        print("Place new_reshet_subscription.txt à la racine du repo, ou passe --file.")
        sys.exit(1)

    url = resolve_database_url()
    print(f"Target DB: {describe_database_url(url)}")
    print(f"File: {path}")

    sub = parse_subscription_text(path.read_text(encoding="utf-8"))
    print(f"Reshet: {sub.reshet_name} | menahel: {sub.menahel_reshet} | snifim: {len(sub.snifim)}")

    db_session.reset_engine()
    db_session.get_engine()
    if db_session.SessionLocal is None:
        print("Impossible d'initialiser la session DB.")
        sys.exit(1)

    db = db_session.SessionLocal()
    try:
        creds = apply_subscription(db, sub)
        db.commit()
        print_credentials(creds)
        print("OK.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
