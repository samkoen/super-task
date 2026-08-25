"""Contrôle d'accès aux URLs média (Blob /uploads) selon le périmètre acteur."""
from __future__ import annotations

from sqlalchemy import String, cast, or_, select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp
from app.domain.scope import ActorContext
from app.domain.task_scope import visible_branch_ids_for_tasks
from app.repositories.branch_repository import BranchRepository


def actor_can_access_media_url(db: Session, actor: ActorContext, media_url: str) -> bool:
    url = (media_url or "").strip()
    if not url:
        return False

    if _is_own_avatar(db, actor.user_id, url):
        return True

    branch_ids = visible_branch_ids_for_tasks(actor, BranchRepository(db))
    # Admin / network sans filtre branche : URL doit exister en DB
    if branch_ids is None:
        return _url_exists(db, url)

    if not branch_ids:
        return False
    return _url_exists_in_branches(
        db, url, list(branch_ids), network_id=actor.network_id
    )


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
        or db.execute(
            select(orm.TaskGalleryItem.id).where(_gallery_media_match(url)).limit(1)
        ).first()
        or db.execute(
            select(orm.TaskMessage.id).where(_message_media_match(url)).limit(1)
        ).first()
        or db.execute(
            select(orm.User.id).where(orm.User.avatar_url == url).limit(1)
        ).first()
    )


def _url_exists_in_branches(
    db: Session,
    url: str,
    branch_ids: list[str],
    *,
    network_id: str | None = None,
) -> bool:
    uuids = [mp.parse_uuid(b) for b in branch_ids]
    if (
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
        or _gallery_url_in_scope(db, url, uuids, network_id)
        or db.execute(
            select(orm.TaskMessage.id)
            .join(
                orm.TaskOccurrence,
                orm.TaskOccurrence.id == orm.TaskMessage.occurrence_id,
            )
            .where(orm.TaskOccurrence.branch_id.in_(uuids))
            .where(_message_media_match(url))
            .limit(1)
        ).first()
        or _avatar_url_in_branches(db, url, uuids)
    ):
        return True
    return False


def _is_own_avatar(db: Session, user_id: str | None, url: str) -> bool:
    if not user_id:
        return False
    try:
        uid = mp.parse_uuid(user_id)
    except ValueError:
        return False
    return bool(
        db.execute(
            select(orm.User.id)
            .where(orm.User.id == uid)
            .where(orm.User.avatar_url == url)
            .limit(1)
        ).first()
    )


def _avatar_url_in_branches(db: Session, url: str, branch_uuids: list) -> bool:
    member_ids = select(orm.UserBranchMembership.user_id).where(
        orm.UserBranchMembership.branch_id.in_(branch_uuids)
    )
    return bool(
        db.execute(
            select(orm.User.id)
            .where(orm.User.avatar_url == url)
            .where(or_(orm.User.branch_id.in_(branch_uuids), orm.User.id.in_(member_ids)))
            .limit(1)
        ).first()
    )


def _gallery_url_in_scope(
    db: Session,
    url: str,
    branch_uuids: list,
    network_id: str | None,
) -> bool:
    """Galerie : même snif, ou modèle réseau (branch_id null) du même network."""
    q = (
        select(orm.TaskGalleryItem.id)
        .where(_gallery_media_match(url))
        .where(
            or_(
                orm.TaskGalleryItem.branch_id.in_(branch_uuids),
                orm.TaskGalleryItem.branch_id.is_(None),
            )
        )
    )
    if network_id:
        q = q.where(orm.TaskGalleryItem.network_id == mp.parse_uuid(network_id))
    return bool(db.execute(q.limit(1)).first())


def _json_column_has_url(column, url: str):
    return cast(column, String).contains(url)


def _occurrence_media_match(url: str):
    return or_(
        orm.TaskOccurrence.reference_photo_url == url,
        orm.TaskOccurrence.reference_video_url == url,
        orm.TaskOccurrence.reference_audio_url == url,
        _json_column_has_url(orm.TaskOccurrence.completion_requirements, url),
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
        _json_column_has_url(orm.TaskTemplate.completion_requirements, url),
    )


def _issue_media_match(url: str):
    return or_(
        orm.IssueReport.photo_url == url,
        orm.IssueReport.video_url == url,
        orm.IssueReport.audio_url == url,
    )


def _gallery_media_match(url: str):
    return or_(
        orm.TaskGalleryItem.reference_photo_url == url,
        orm.TaskGalleryItem.reference_video_url == url,
        orm.TaskGalleryItem.reference_audio_url == url,
        _json_column_has_url(orm.TaskGalleryItem.completion_requirements, url),
    )


def _message_media_match(url: str):
    return or_(
        orm.TaskMessage.photo_url == url,
        orm.TaskMessage.video_url == url,
        orm.TaskMessage.audio_url == url,
    )
