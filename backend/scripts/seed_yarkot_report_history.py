"""Seed historique 30 jours — réseau ירקות — pour tester דוחות.

Usage (dev / Neon):
  python scripts/seed_yarkot_report_history.py --confirm

Idempotent : supprime d'abord les occurrences marquées [seed-reports-yarkot].
"""
from __future__ import annotations

import argparse
import random
import sys
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv

load_dotenv(backend_dir / ".env")

from scripts._db_env import (  # noqa: E402
    describe_database_url,
    is_production_target,
    resolve_database_url,
)
import app.db.models as orm  # noqa: E402
import app.db.session as db_session  # noqa: E402
from app.domain import roles, task_status  # noqa: E402
from app.domain.task_kind import AD_HOC, FIXED  # noqa: E402
from app.repositories.branch_repository import BranchRepository  # noqa: E402
from app.repositories.network_repository import NetworkRepository  # noqa: E402
from app.repositories.user_repository import UserRepository  # noqa: E402
from sqlalchemy import delete, or_, select  # noqa: E402

TZ = ZoneInfo("Asia/Jerusalem")
NETWORK_NAME = "ירקות"
SEED_TAG = "[seed-reports-yarkot]"
DAYS = 30

FIXED_TITLES = (
    "סידור מדף ירקות",
    "בדיקת טריות בקירור",
    "ניקיון אזור שקילה",
)
AD_HOC_TITLES = (
    "החלפת שלט מבצע",
    "מיון סחורה פגומה",
    "עזרה לפריקה",
    "סימון מחירים",
    "סידור תצוגת כניסה",
)


def _at(day: date, hour: int, minute: int = 0) -> datetime:
    return datetime.combine(day, time(hour=hour, minute=minute), tzinfo=TZ)


def _purge_seed(db) -> int:
    rows = db.execute(
        select(orm.TaskOccurrence.id).where(
            or_(
                orm.TaskOccurrence.description.like(f"%{SEED_TAG}%"),
                orm.TaskOccurrence.title.like(f"%{SEED_TAG}%"),
            )
        )
    ).scalars().all()
    if not rows:
        return 0
    db.execute(delete(orm.TaskCompletion).where(orm.TaskCompletion.occurrence_id.in_(rows)))
    db.execute(delete(orm.TaskOccurrence).where(orm.TaskOccurrence.id.in_(rows)))
    db.flush()
    return len(rows)


def _pick_outcome(rng: random.Random, day: date, today: date) -> str:
    age = (today - day).days
    if age == 0:
        return rng.choice(
            [task_status.PENDING, task_status.IN_PROGRESS, task_status.COMPLETED, task_status.PENDING_REVIEW]
        )
    if age == 1:
        return rng.choice(
            [task_status.COMPLETED, task_status.COMPLETED, task_status.OVERDUE, task_status.PENDING_REVIEW]
        )
    # older days: mostly done or overdue leftovers
    roll = rng.random()
    if roll < 0.62:
        return task_status.COMPLETED
    if roll < 0.78:
        return task_status.OVERDUE
    if roll < 0.88:
        return task_status.COMPLETED
    return task_status.CANCELLED


def _add_occurrence(
    db,
    *,
    branch_id,
    assignee_id,
    manager_id,
    title: str,
    task_kind: str,
    day: date,
    due_hour: int,
    status: str,
    rng: random.Random,
) -> None:
    due_at = _at(day, due_hour, rng.choice([0, 15, 30]))
    started_at = None
    if status in {
        task_status.IN_PROGRESS,
        task_status.PENDING_REVIEW,
        task_status.COMPLETED,
        task_status.AWAITING_RESPONSE,
    }:
        started_at = due_at - timedelta(minutes=rng.randint(5, 40))

    occ = orm.TaskOccurrence(
        id=__import__("uuid").uuid4(),
        template_id=None,
        branch_id=branch_id,
        title=title,
        description=f"{SEED_TAG} היסטוריה לבדיקת דוחות",
        due_at=due_at,
        opened_on=day,
        status=status,
        assignee_user_id=assignee_id,
        department_id=None,
        task_kind=task_kind,
        manager_user_id=None,
        photo_required=False,
        created_by_id=manager_id,
        started_at=started_at,
        started_by_id=assignee_id if started_at else None,
    )
    db.add(occ)
    db.flush()

    if status in {task_status.COMPLETED, task_status.PENDING_REVIEW}:
        duration = rng.randint(12, 95)
        completed_at = (started_at or due_at) + timedelta(minutes=duration)
        review = (
            task_status.REVIEW_APPROVED
            if status == task_status.COMPLETED
            else task_status.REVIEW_PENDING
        )
        comp = orm.TaskCompletion(
            id=__import__("uuid").uuid4(),
            occurrence_id=occ.id,
            status="done",
            note=None,
            photo_path=None,
            video_path=None,
            audio_path=None,
            not_completed_reason=None,
            completed_by_id=assignee_id,
            completed_at=completed_at,
            manager_review_status=review,
            manager_reviewed_by_id=manager_id if status == task_status.COMPLETED else None,
            manager_reviewed_at=completed_at + timedelta(minutes=5)
            if status == task_status.COMPLETED
            else None,
        )
        db.add(comp)


def _employees_for_branch(db, branch_id) -> list:
    member_ids = select(orm.UserBranchMembership.user_id).where(
        orm.UserBranchMembership.branch_id == branch_id
    )
    return (
        db.execute(
            select(orm.User)
            .where(orm.User.role == roles.EMPLOYEE)
            .where(
                or_(orm.User.branch_id == branch_id, orm.User.id.in_(member_ids))
            )
            .order_by(orm.User.first_name)
        )
        .scalars()
        .unique()
        .all()
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--confirm", action="store_true")
    parser.add_argument("--days", type=int, default=DAYS)
    args = parser.parse_args()

    url = resolve_database_url()
    print(f"DB: {describe_database_url(url)}")
    if is_production_target(url) and not args.confirm:
        print("Cible Neon/production. Relancez avec --confirm.")
        sys.exit(1)

    db_session.reset_engine()
    db_session.get_engine()
    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    rng = random.Random(42)
    today = datetime.now(TZ).date()

    try:
        nets = NetworkRepository(db).list_all()
        network = next((n for n in nets if n.name == NETWORK_NAME), None)
        if not network:
            print(f"Réseau '{NETWORK_NAME}' introuvable.")
            sys.exit(1)

        managers = [
            u
            for u in UserRepository(db).list_users()
            if u.network_id == network.id
            and u.role in {roles.NETWORK_MANAGER, roles.BRANCH_MANAGER}
        ]
        if not managers:
            print("Aucun menahel pour ce réseau.")
            sys.exit(1)
        default_mgr = next(
            (m for m in managers if m.role == roles.NETWORK_MANAGER), managers[0]
        )

        purged = _purge_seed(db)
        print(f"Purged previous seed: {purged}")

        branches = BranchRepository(db).list_branches(network_id=network.id)
        created = 0
        for branch in branches:
            emps = _employees_for_branch(db, __import__("uuid").UUID(branch.id))
            if not emps:
                print(f"  skip {branch.name}: no employees")
                continue
            mgr = next(
                (m for m in managers if m.branch_id == branch.id),
                default_mgr,
            )
            mgr_uuid = __import__("uuid").UUID(mgr.id)
            print(f"  {branch.name}: {len(emps)} ovdim")
            for emp in emps:
                emp_uuid = emp.id
                for offset in range(args.days):
                    day = today - timedelta(days=offset)
                    for i, title in enumerate(FIXED_TITLES):
                        status = _pick_outcome(rng, day, today)
                        _add_occurrence(
                            db,
                            branch_id=__import__("uuid").UUID(branch.id),
                            assignee_id=emp_uuid,
                            manager_id=mgr_uuid,
                            title=title,
                            task_kind=FIXED,
                            day=day,
                            due_hour=9 + i * 3,
                            status=status,
                            rng=rng,
                        )
                        created += 1
                    # 0–2 ad-hoc / day
                    for _ in range(rng.randint(0, 2)):
                        status = _pick_outcome(rng, day, today)
                        _add_occurrence(
                            db,
                            branch_id=__import__("uuid").UUID(branch.id),
                            assignee_id=emp_uuid,
                            manager_id=mgr_uuid,
                            title=rng.choice(AD_HOC_TITLES),
                            task_kind=AD_HOC,
                            day=day,
                            due_hour=rng.randint(10, 18),
                            status=status,
                            rng=rng,
                        )
                        created += 1
            db.commit()

        print(f"Created {created} occurrences on '{NETWORK_NAME}'.")
        print("OK — teste /manager/reports (7d / 30d).")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
