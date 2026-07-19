"""Crée le premier administrateur."""
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
from app.repositories.user_repository import UserRepository  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Créer un administrateur Super")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--first-name", default="מנהל")
    parser.add_argument("--last-name", default="מערכת")
    args = parser.parse_args()

    url = resolve_database_url()
    print(f"Target DB: {describe_database_url(url)}")

    db_session.reset_engine()
    db_session.get_engine()
    if db_session.SessionLocal is None:
        print("Impossible d'initialiser la session DB.")
        sys.exit(1)

    db = db_session.SessionLocal()
    try:
        repo = UserRepository(db)
        if repo.count_by_email(args.email) > 0:
            print(f"Un utilisateur avec l'email {args.email} existe déjà.")
            sys.exit(1)
        user = repo.create_admin(
            email=args.email,
            password=args.password,
            first_name=args.first_name,
            last_name=args.last_name,
        )
        db.commit()
        print(f"Admin created: {user.email} ({user.full_name})")
    finally:
        db.close()


if __name__ == "__main__":
    main()
