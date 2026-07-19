"""Seed production — réseau démo שפע ברכת השם / בבא סאלי."""
from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv

load_dotenv(backend_dir / ".env")

from scripts._db_env import describe_database_url, resolve_database_url  # noqa: E402
from app.db import session as db_session  # noqa: E402
from app.domain import job_functions, roles, task_recurrence  # noqa: E402
from app.repositories.branch_repository import BranchRepository  # noqa: E402
from app.repositories.department_repository import DepartmentRepository  # noqa: E402
from app.repositories.network_repository import NetworkRepository  # noqa: E402
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository  # noqa: E402
from app.repositories.task_template_repository import TaskTemplateRepository  # noqa: E402
from app.repositories.user_repository import UserRepository  # noqa: E402
from app.services.task_scheduler_service import TaskSchedulerService  # noqa: E402

TZ = ZoneInfo("Asia/Jerusalem")
EMAIL_BASE = "super.nihul26"
EMAIL_DOMAIN = "gmail.com"
SEED_TAG = "shefa-baba-sali-prod"
MARKER_EMAIL_SUFFIX = 100
DEFAULT_PASSWORD = os.environ.get("SEED_DEFAULT_PASSWORD", "SuperDemo123!")


def seed_email(suffix: int) -> str:
    return f"{EMAIL_BASE}+{suffix}@{EMAIL_DOMAIN}"


def is_production_target() -> bool:
    if os.environ.get("ENVIRONMENT", "").strip().lower() == "production":
        return True
    db_url = os.environ.get("DATABASE_URL", "").lower()
    return ".neon.tech" in db_url or "vercel" in db_url


def require_confirmation(force: bool) -> None:
    if force or not is_production_target():
        return
    print("Cible production detectee (Neon/Vercel ou ENVIRONMENT=production).")
    print("Relancez avec --confirm pour appliquer le seed.")
    sys.exit(1)


def split_name(full: str) -> tuple[str, str]:
    parts = full.strip().split(maxsplit=1)
    if len(parts) == 1:
        return parts[0], parts[0]
    return parts[0], parts[1]


def ensure_user(
    repo: UserRepository,
    *,
    email: str,
    first_name: str,
    last_name: str,
    role: str,
    network_id: str | None = None,
    branch_id: str | None = None,
    job_function: str | None = None,
) -> str:
    existing = repo.find_by_email(email)
    if existing:
        print(f"  exists: {email} ({existing.full_name})")
        return existing.id
    user = repo.create_user(
        email=email,
        password=DEFAULT_PASSWORD,
        first_name=first_name,
        last_name=last_name,
        role=role,
        network_id=network_id,
        branch_id=branch_id,
        job_function=job_function,
        email_verified=True,
    )
    print(f"  created: {email} ({user.full_name}) - {role}")
    return user.id


def seed_network_and_branch(
    network_repo: NetworkRepository,
    branch_repo: BranchRepository,
) -> tuple:
    existing = [r for r in network_repo.list_all() if r.name == "שפע ברכת השם"]
    network = existing[0] if existing else network_repo.create(name="שפע ברכת השם")
    branches = branch_repo.list_branches(network_id=network.id, name="בבא סאלי")
    branch = branches[0] if branches else branch_repo.create(
        network_id=network.id,
        name="בבא סאלי",
        address="",
        city="",
        postal_code="",
    )
    print(f"  network: {network.name} ({network.id})")
    print(f"  branch: {branch.name} ({branch.id})")
    return network, branch


def seed_departments(department_repo: DepartmentRepository, branch_id: str) -> None:
    for order, name in enumerate(("סדרנים", "מחסן", "קופות"), start=1):
        department_repo.create(branch_id=branch_id, name=name, sort_order=order)


def seed_users(
    user_repo: UserRepository,
    *,
    network_id: str,
    branch_id: str,
) -> tuple[str, str, dict[str, str]]:
    vp_id = ensure_user(
        user_repo,
        email=seed_email(100),
        first_name="ניר",
        last_name="תפעול",
        role=roles.NETWORK_MANAGER,
        network_id=network_id,
    )
    branch_manager_id = ensure_user(
        user_repo,
        email=seed_email(101),
        first_name="מתן",
        last_name="ניסים",
        role=roles.BRANCH_MANAGER,
        network_id=network_id,
        branch_id=branch_id,
    )

    stockers = [
        "מונאדל",
        "חאמד",
        "יזיד",
        "מולוד",
        "איברהים",
        "מאיר הולצמן",
        "איהב",
        "משה עדי",
    ]
    employee_ids: dict[str, str] = {}
    email_suffix = 102
    for name in stockers:
        fn, ln = split_name(name)
        employee_ids[name] = ensure_user(
            user_repo,
            email=seed_email(email_suffix),
            first_name=fn,
            last_name=ln,
            role=roles.EMPLOYEE,
            network_id=network_id,
            branch_id=branch_id,
            job_function=job_functions.STOCKERS,
        )
        email_suffix += 1

    employee_ids["אוראל"] = ensure_user(
        user_repo,
        email=seed_email(110),
        first_name="אוראל",
        last_name="אוראל",
        role=roles.EMPLOYEE,
        network_id=network_id,
        branch_id=branch_id,
        job_function=job_functions.WAREHOUSE_WORKER,
    )
    employee_ids["שירה"] = ensure_user(
        user_repo,
        email=seed_email(111),
        first_name="שירה",
        last_name="שירה",
        role=roles.EMPLOYEE,
        network_id=network_id,
        branch_id=branch_id,
        job_function=job_functions.HEAD_CASHIER,
    )
    return vp_id, branch_manager_id, employee_ids


def seed_tasks(
    *,
    template_repo: TaskTemplateRepository,
    occurrence_repo: TaskOccurrenceRepository,
    scheduler: TaskSchedulerService,
    branch_id: str,
    branch_manager_id: str,
    vp_id: str,
    employee_ids: dict[str, str],
) -> None:
    fixed_samples = [
        ("מונאדל", "סידור מדפים — מחלקה ראשית", task_recurrence.DAILY, "09:00", None),
        ("חאמד", "בדיקת מחירים", task_recurrence.WEEKLY, "10:00", "0"),
        ("יזיד", "ניקוי אזור כניסה", task_recurrence.BIWEEKLY, "08:00", "0"),
        ("אוראל", "ספירת מלאי מחסן", task_recurrence.DAILY, "07:30", None),
        ("שירה", "פתיחת קופה ראשית", task_recurrence.DAILY, "08:00", None),
    ]
    for employee_name, title, recurrence, due_time, weekly_days in fixed_samples:
        assignee = employee_ids[employee_name]
        template = template_repo.create(
            branch_id=branch_id,
            title=title,
            description=f"משימה קבועה — {employee_name}",
            recurrence=recurrence,
            due_time=due_time,
            weekly_days=weekly_days,
            monthly_day=None,
            assignee_user_id=assignee,
            department_id=None,
            created_by_id=branch_manager_id,
            task_kind="fixed",
            biweekly_anchor=datetime.now(TZ) if recurrence == task_recurrence.BIWEEKLY else None,
        )
        scheduler.generate_from_template(template, on_date=datetime.now(TZ).date())
        print(f"  fixed: {title} -> {employee_name}")

    due = datetime.now(TZ) + timedelta(days=1)
    occurrence_repo.create(
        template_id=None,
        branch_id=branch_id,
        title="צילום ותיעוד — ביקורת פתאומית",
        description="מטלה מזדמנת מהנהלת הרשת — יש להעביר לעובד ולתעד בצילום",
        due_at=due,
        assignee_user_id=None,
        department_id=None,
        task_kind="ad_hoc",
        manager_user_id=branch_manager_id,
        photo_required=True,
        created_by_id=vp_id,
    )
    print("  ad_hoc: en attente d'assignation au manager de succursale")


def print_accounts() -> None:
    print("\n=== Comptes seed (production) ===")
    print(f"Manager reseau:  {seed_email(100)} / {DEFAULT_PASSWORD}")
    print(f"Manager succ.:   {seed_email(101)} / {DEFAULT_PASSWORD}")
    print(f"Employe demo:    {seed_email(102)} / {DEFAULT_PASSWORD}")
    print(f"Tag: {SEED_TAG}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed production Super — שפע ברכת השם")
    parser.add_argument("--force", action="store_true", help="Recree les taches meme si le seed existe")
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Requis sur Neon/Vercel (ENVIRONMENT=production)",
    )
    args = parser.parse_args()
    require_confirmation(args.confirm)

    url = resolve_database_url()
    print(f"Target DB: {describe_database_url(url)}")

    db_session.reset_engine()
    db_session.get_engine()
    if db_session.SessionLocal is None:
        print("Impossible d'initialiser la session DB.")
        sys.exit(1)

    db = db_session.SessionLocal()
    try:
        user_repo = UserRepository(db)
        if user_repo.find_by_email(seed_email(MARKER_EMAIL_SUFFIX)) and not args.force:
            print("Seed deja applique. Utilisez --force pour recreer les taches.")
            print_accounts()
            return

        network_repo = NetworkRepository(db)
        branch_repo = BranchRepository(db)
        department_repo = DepartmentRepository(db)
        template_repo = TaskTemplateRepository(db)
        occurrence_repo = TaskOccurrenceRepository(db)
        scheduler = TaskSchedulerService(template_repo, occurrence_repo)

        print("=== Network & Branch ===")
        network, branch = seed_network_and_branch(network_repo, branch_repo)

        print("=== Departments ===")
        seed_departments(department_repo, branch.id)

        print("=== Utilisateurs ===")
        vp_id, branch_manager_id, employee_ids = seed_users(
            user_repo,
            network_id=network.id,
            branch_id=branch.id,
        )

        print("=== Taches ===")
        seed_tasks(
            template_repo=template_repo,
            occurrence_repo=occurrence_repo,
            scheduler=scheduler,
            branch_id=branch.id,
            branch_manager_id=branch_manager_id,
            vp_id=vp_id,
            employee_ids=employee_ids,
        )

        scheduler.run_for_date()
        db.commit()
        print_accounts()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
