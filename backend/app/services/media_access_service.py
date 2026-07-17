"""Contrôle d'accès aux URLs média (Blob /uploads) selon le périmètre acteur."""
from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.domain.scope import ActorContext
from app.domain.task_scope import visible_branch_ids_for_tasks
from app.repositories.branch_repository import BranchRepository


def actor_can_access_media_url(db: Session, actor: ActorContext, media_url: str) -> bool:
    url = (media_url or "").strip()
    if not url:
        return False

    branch_ids = visible_branch_ids_for_tasks(actor, BranchRepository(db))
    # Admin / network sans filtre branche : URL doit exister en DB
    if branch_ids is None:
        return _url_exists(db, url)

    if not branch_ids:
        return False
    return _url_exists_in_branches(db, url, list(branch_ids))


def _url_exists(db: Session, url: str) -> bool:
    return bool(
        db.execute(
            select(orm.TaskOccurrence.id)
            .where(_occurrence_media_match(url))
            .limit(1)
        ).first()
        or db.execute(
            select(orm.TaskCompletion.id).where(_completion_media_match(url)).limit(1)
        ).first()
        or db.execute(
            select(orm.TaskTemplate.id).where(_template_media_match(url)).limit(1)
        ).first()
        or db.execute(
            select(orm.IssueReport.id).where(_issue_media_match(url)).limit(1)
        ).first()
    )


def _url_exists_in_branches(db: Session, url: str, branch_ids: list[str]) -> bool:
    from app.db import mappers as mp

    uuids = [mp.parse_uuid(b) for b in branch_ids]
    return bool(
        db.execute(
            select(orm.TaskOccurrence.id)
            .where(orm.TaskOccurrence.branch_id.in_(uuids))
            .where(_occurrence_media_match(url))
            .limit(1)
        ).first()
        or db.execute(
            select(orm.TaskCompletion.id)
            .join(
                orm.TaskOccurrence,
                orm.TaskOccurrence.id == orm.TaskCompletion.occurrence_id,
            )
            .where(orm.TaskOccurrence.branch_id.in_(uuids))
            .where(_completion_media_match(url))
            .limit(1)
        ).first()
        or db.execute(
            select(orm.TaskTemplate.id)
            .where(orm.TaskTemplate.branch_id.in_(uuids))
            .where(_template_media_match(url))
            .limit(1)
        ).first()
        or db.execute(
            select(orm.IssueReport.id)
            .where(orm.IssueReport.branch_id.in_(uuids))
            .where(_issue_media_match(url))
            .limit(1)
        ).first()
    )


def _occurrence_media_match(url: str):
    return or_(
        orm.TaskOccurrence.reference_photo_url == url,
        orm.TaskOccurrence.reference_video_url == url,
        orm.TaskOccurrence.reference_audio_url == url,
    )


def _completion_media_match(url: str):
    return or_(
        orm.TaskCompletion.photo_path == url,
        orm.TaskCompletion.video_path == url,
        orm.TaskCompletion.audio_path == url,
    )


def _template_media_match(url: str):
    return or_(
        orm.TaskTemplate.reference_photo_url == url,
        orm.TaskTemplate.reference_video_url == url,
        orm.TaskTemplate.reference_audio_url == url,
    )


def _issue_media_match(url: str):
    return or_(
        orm.IssueReport.photo_url == url,
        orm.IssueReport.video_url == url,
        orm.IssueReport.audio_url == url,
    )
