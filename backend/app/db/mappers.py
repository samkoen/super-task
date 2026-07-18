"""Conversions ORM <-> modèles domaine."""
from __future__ import annotations

import uuid
from datetime import datetime

import app.db.models as orm
from app.models.branch import Branch
from app.models.department import Department
from app.models.invitation import UserInvitation
from app.models.network import Network
from app.models.product import Product
from app.models.task_completion import TaskCompletion
from app.models.task_occurrence import TaskOccurrence
from app.models.task_template import TaskTemplate
from app.models.user import User


def parse_uuid(value: str | uuid.UUID | None) -> uuid.UUID:
    if value is None:
        raise ValueError("identifiant manquant")
    if isinstance(value, uuid.UUID):
        return value
    return uuid.UUID(str(value))


def parse_datetime_iso(dt: datetime | None) -> str:
    if dt is None:
        return datetime.now().isoformat()
    if dt.tzinfo is not None:
        return dt.isoformat()
    return dt.replace(tzinfo=None).isoformat()


def user_orm_to_domain(row: orm.User | None) -> User | None:
    if row is None:
        return None
    return User(
        id=str(row.id),
        email=row.email,
        first_name=row.first_name,
        last_name=row.last_name,
        role=row.role,
        phone=row.phone,
        job_function=row.job_function,
        network_id=str(row.network_id) if row.network_id else None,
        branch_id=str(row.branch_id) if row.branch_id else None,
        is_active=row.is_active,
        email_verified=row.email_verified,
        preferred_language=getattr(row, "preferred_language", None) or "he",
        created_at=parse_datetime_iso(row.created_at),
        updated_at=parse_datetime_iso(row.updated_at),
    )


def user_domain_to_api(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": user.full_name,
        "role": user.role,
        "phone": user.phone,
        "job_function": user.job_function,
        "network_id": user.network_id,
        "branch_id": user.branch_id,
        "is_active": user.is_active,
        "email_verified": user.email_verified,
        "preferred_language": user.preferred_language,
    }


def invitation_orm_to_domain(row: orm.UserInvitation | None) -> UserInvitation | None:
    if row is None:
        return None
    return UserInvitation(
        id=str(row.id),
        email=row.email,
        role=row.role,
        job_function=row.job_function,
        network_id=str(row.network_id) if row.network_id else None,
        branch_id=str(row.branch_id) if row.branch_id else None,
        invited_by_id=str(row.invited_by_id),
        status=row.status,
        expires_at=parse_datetime_iso(row.expires_at),
        accepted_at=parse_datetime_iso(row.accepted_at) if row.accepted_at else None,
        created_at=parse_datetime_iso(row.created_at),
    )


def invitation_domain_to_api(inv: UserInvitation) -> dict:
    return {
        "id": inv.id,
        "email": inv.email,
        "role": inv.role,
        "job_function": inv.job_function,
        "network_id": inv.network_id,
        "branch_id": inv.branch_id,
        "invited_by_id": inv.invited_by_id,
        "status": inv.status,
        "expires_at": inv.expires_at,
        "accepted_at": inv.accepted_at,
        "created_at": inv.created_at,
    }


def network_orm_to_domain(row: orm.Network | None) -> Network | None:
    if row is None:
        return None
    return Network(
        id=str(row.id),
        name=row.name,
        is_active=row.is_active,
        created_at=parse_datetime_iso(row.created_at),
        updated_at=parse_datetime_iso(row.updated_at),
    )


def network_domain_to_api(r: Network) -> dict:
    return r.to_dict()


def branch_orm_to_domain(row: orm.Branch | None) -> Branch | None:
    if row is None:
        return None
    return Branch(
        id=str(row.id),
        network_id=str(row.network_id),
        name=row.name,
        address=row.address,
        city=row.city,
        postal_code=row.postal_code,
        is_active=row.is_active,
        created_at=parse_datetime_iso(row.created_at),
        updated_at=parse_datetime_iso(row.updated_at),
    )


def branch_domain_to_api(s: Branch, *, network_name: str | None = None) -> dict:
    data = s.to_dict()
    if network_name is not None:
        data["network_name"] = network_name
    return data


def department_orm_to_domain(row: orm.Department | None) -> Department | None:
    if row is None:
        return None
    return Department(
        id=str(row.id),
        branch_id=str(row.branch_id),
        name=row.name,
        sort_order=row.sort_order,
        is_active=row.is_active,
        created_at=parse_datetime_iso(row.created_at),
        updated_at=parse_datetime_iso(row.updated_at),
    )


def department_domain_to_api(m: Department, *, branch_name: str | None = None) -> dict:
    data = m.to_dict()
    if branch_name is not None:
        data["branch_name"] = branch_name
    return data


def product_orm_to_domain(row: orm.Product | None) -> Product | None:
    if row is None:
        return None
    return Product(
        id=str(row.id),
        department_id=str(row.department_id),
        name=row.name,
        sku=row.sku,
        is_active=row.is_active,
        created_at=parse_datetime_iso(row.created_at),
        updated_at=parse_datetime_iso(row.updated_at),
    )


def product_domain_to_api(p: Product, *, department_name: str | None = None) -> dict:
    data = p.to_dict()
    if department_name is not None:
        data["department_name"] = department_name
    return data


def task_template_orm_to_domain(row: orm.TaskTemplate | None) -> TaskTemplate | None:
    if row is None:
        return None
    return TaskTemplate(
        id=str(row.id),
        branch_id=str(row.branch_id),
        title=row.title,
        description=row.description,
        recurrence=row.recurrence,
        due_time=row.due_time,
        weekly_days=row.weekly_days,
        monthly_day=row.monthly_day,
        assignee_user_id=str(row.assignee_user_id) if row.assignee_user_id else None,
        department_id=str(row.department_id) if row.department_id else None,
        task_kind=row.task_kind,
        photo_required=row.photo_required,
        reference_photo_url=row.reference_photo_url,
        reference_video_url=row.reference_video_url,
        reference_audio_url=row.reference_audio_url,
        biweekly_anchor=parse_datetime_iso(row.biweekly_anchor) if row.biweekly_anchor else None,
        is_active=row.is_active,
        created_by_id=str(row.created_by_id),
        created_at=parse_datetime_iso(row.created_at),
        updated_at=parse_datetime_iso(row.updated_at),
        source_gallery_item_id=(
            str(row.source_gallery_item_id)
            if getattr(row, "source_gallery_item_id", None)
            else None
        ),
    )


def task_template_domain_to_api(t: TaskTemplate, **extra) -> dict:
    data = t.to_dict()
    data.update(extra)
    return data


def task_occurrence_orm_to_domain(row: orm.TaskOccurrence | None) -> TaskOccurrence | None:
    if row is None:
        return None
    return TaskOccurrence(
        id=str(row.id),
        template_id=str(row.template_id) if row.template_id else None,
        branch_id=str(row.branch_id),
        title=row.title,
        description=row.description,
        due_at=parse_datetime_iso(row.due_at),
        status=row.status,
        assignee_user_id=str(row.assignee_user_id) if row.assignee_user_id else None,
        department_id=str(row.department_id) if row.department_id else None,
        task_kind=row.task_kind,
        manager_user_id=str(row.manager_user_id) if row.manager_user_id else None,
        photo_required=row.photo_required,
        reference_photo_url=row.reference_photo_url,
        reference_video_url=row.reference_video_url,
        reference_audio_url=row.reference_audio_url,
        media_purge_after=(
            parse_datetime_iso(row.media_purge_after) if row.media_purge_after else None
        ),
        started_at=parse_datetime_iso(row.started_at) if row.started_at else None,
        started_by_id=str(row.started_by_id) if row.started_by_id else None,
        created_by_id=str(row.created_by_id) if row.created_by_id else None,
        created_at=parse_datetime_iso(row.created_at),
        updated_at=parse_datetime_iso(row.updated_at),
        source_gallery_item_id=(
            str(row.source_gallery_item_id)
            if getattr(row, "source_gallery_item_id", None)
            else None
        ),
    )


def task_occurrence_domain_to_api(o: TaskOccurrence, **extra) -> dict:
    data = o.to_dict()
    data["pending_delegation"] = o.pending_delegation
    data.update(extra)
    return data


def task_completion_orm_to_domain(row: orm.TaskCompletion | None) -> TaskCompletion | None:
    if row is None:
        return None
    return TaskCompletion(
        id=str(row.id),
        occurrence_id=str(row.occurrence_id),
        status=row.status,
        note=row.note,
        photo_path=row.photo_path,
        video_path=row.video_path,
        audio_path=row.audio_path,
        audio_transcript=row.audio_transcript,
        audio_transcript_employee=getattr(row, "audio_transcript_employee", None),
        not_completed_reason=row.not_completed_reason,
        completed_by_id=str(row.completed_by_id),
        completed_at=parse_datetime_iso(row.completed_at),
        manager_review_status=row.manager_review_status,
        manager_reviewed_by_id=str(row.manager_reviewed_by_id) if row.manager_reviewed_by_id else None,
        manager_reviewed_at=parse_datetime_iso(row.manager_reviewed_at) if row.manager_reviewed_at else None,
        rejection_note=row.rejection_note,
    )


def task_completion_domain_to_api(c: TaskCompletion) -> dict:
    return c.to_dict()
