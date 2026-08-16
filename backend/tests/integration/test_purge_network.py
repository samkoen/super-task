"""Purge d'une רשת : tout est supprimé, les autres רשתות restent."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import app.db.session as db_session
from app.domain import roles, task_status
from app.repositories.branch_repository import BranchRepository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.invitation_repository import InvitationRepository
from app.repositories.issue_report_repository import IssueReportRepository
from app.repositories.network_repository import NetworkRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.promotion_stage_repository import PromotionStageRepository
from app.repositories.task_completion_repository import TaskCompletionRepository
from app.repositories.task_gallery_repository import TaskGalleryRepository
from app.repositories.task_message_repository import TaskMessageRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.task_template_repository import TaskTemplateRepository
from app.repositories.task_translation_repository import TaskTranslationRepository
from app.repositories.user_repository import UserRepository
from app.services.purge_network_service import preview_network_purge, purge_network


def _open_db():
    assert db_session.SessionLocal is not None
    return db_session.SessionLocal()


def _seed_people(db, tag: str) -> dict[str, str]:
    net = NetworkRepository(db).create(name=f"Reshet {tag}")
    branch = BranchRepository(db).create(
        network_id=net.id, name=f"Snif {tag}", address="", city="", postal_code=""
    )
    users = UserRepository(db)
    mgr = users.create_user(
        email=f"mgr.{tag}@purge.test",
        password="Test1234!",
        first_name="Mgr",
        last_name=tag,
        role=roles.NETWORK_MANAGER,
        email_verified=True,
        network_id=net.id,
    )
    emp = users.create_user(
        email=f"emp.{tag}@purge.test",
        password="Test1234!",
        first_name="Oved",
        last_name=tag,
        role=roles.EMPLOYEE,
        email_verified=True,
        network_id=net.id,
        branch_id=branch.id,
    )
    return {
        "network_id": net.id,
        "branch_id": branch.id,
        "manager_id": mgr.id,
        "employee_id": emp.id,
        "tag": tag,
    }


def _seed_ops(db, world: dict[str, str]) -> None:
    dept = DepartmentRepository(db).create(branch_id=world["branch_id"], name="ירקות")
    ProductRepository(db).create(department_id=dept.id, name="עגבניה")
    PromotionStageRepository(db).create(
        branch_id=world["branch_id"], department_id=dept.id, name="במה א"
    )
    TaskTemplateRepository(db).create(
        branch_id=world["branch_id"],
        title="ניקיון",
        description="",
        recurrence="daily",
        due_time="10:00",
        weekly_days=None,
        monthly_day=None,
        assignee_user_id=world["employee_id"],
        department_id=dept.id,
        created_by_id=world["manager_id"],
    )
    occ = TaskOccurrenceRepository(db).create(
        template_id=None,
        branch_id=world["branch_id"],
        title="משימה",
        description="",
        due_at=datetime.now(timezone.utc),
        assignee_user_id=world["employee_id"],
        department_id=dept.id,
        status=task_status.PENDING,
        task_kind="ad_hoc",
        manager_user_id=world["manager_id"],
        created_by_id=world["manager_id"],
    )
    _seed_occ_children(db, world, occ.id)


def _seed_occ_children(db, world: dict[str, str], occ_id: str) -> None:
    TaskMessageRepository(db).create(
        occurrence_id=occ_id, sender_user_id=world["employee_id"], body="שלום"
    )
    TaskCompletionRepository(db).create(
        occurrence_id=occ_id,
        status=task_status.COMPLETION_DONE,
        note=None,
        photo_path=None,
        video_path=None,
        audio_path=None,
        not_completed_reason=None,
        completed_by_id=world["employee_id"],
    )
    TaskTranslationRepository(db).upsert(
        occurrence_id=occ_id, language="th", title="t", description="d", spoken_text="s", source_hash="h"
    )
    NotificationRepository(db).create(
        user_id=world["employee_id"],
        kind="task",
        title="t",
        message="m",
        occurrence_id=occ_id,
        branch_id=world["branch_id"],
    )
    _seed_side(db, world)


def _seed_side(db, world: dict[str, str]) -> None:
    IssueReportRepository(db).create(
        reporter_user_id=world["employee_id"], branch_id=world["branch_id"], text="תקלה"
    )
    TaskGalleryRepository(db).create(
        network_id=world["network_id"],
        branch_id=world["branch_id"],
        title="גלריה",
        task_kind="ad_hoc",
        created_by_id=world["manager_id"],
    )
    InvitationRepository(db).create(
        email=f"invite.{world['tag']}@purge.test",
        role=roles.EMPLOYEE,
        job_function=None,
        invited_by_id=world["manager_id"],
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        network_id=world["network_id"],
        branch_id=world["branch_id"],
    )


def _seed_full(db, tag: str) -> dict[str, str]:
    world = _seed_people(db, tag)
    _seed_ops(db, world)
    db.commit()
    return world


def test_purge_removes_reshet_keeps_others(app_env):
    db = _open_db()
    try:
        gone = _seed_full(db, "gone")
        keep = _seed_full(db, "keep")
        admin = UserRepository(db).create_admin(
            email="admin.purge@purge.test",
            password="Test1234!",
            first_name="Admin",
            last_name="Root",
        )
        db.commit()
        preview = preview_network_purge(db, gone["network_id"])
        assert preview.users == 2
        assert preview.occurrences == 1
        assert preview.networks == 1
        counts = purge_network(db, gone["network_id"])
        db.commit()
        assert counts.users == 2
        assert counts.networks == 1
        assert NetworkRepository(db).find_by_id(gone["network_id"]) is None
        assert UserRepository(db).find_by_id(gone["employee_id"]) is None
        assert NetworkRepository(db).find_by_id(keep["network_id"]) is not None
        assert UserRepository(db).find_by_id(keep["employee_id"]) is not None
        assert UserRepository(db).find_by_id(admin.id) is not None
        keep_occs = TaskOccurrenceRepository(db).list_occurrences(branch_id=keep["branch_id"])
        assert len(keep_occs) == 1
        invites = InvitationRepository(db).list_invitations()
        assert [i.email for i in invites] == ["invite.keep@purge.test"]
    finally:
        db.close()


def test_purge_empty_network(app_env):
    db = _open_db()
    try:
        net = NetworkRepository(db).create(name="Empty Only")
        db.commit()
        counts = purge_network(db, net.id)
        db.commit()
        assert counts.networks == 1
        assert counts.users == 0
        assert NetworkRepository(db).find_by_id(net.id) is None
    finally:
        db.close()
