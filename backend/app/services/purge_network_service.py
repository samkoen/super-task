"""Purge totale des données d'une רשת (tâches, ovdim, סניפים, etc.)."""
from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp


@dataclass(frozen=True)
class NetworkScope:
    network_id: UUID
    branch_ids: list
    dept_ids: list
    user_ids: list
    occ_ids: list
    tpl_ids: list
    issue_ids: list
    gallery_ids: list


@dataclass(frozen=True)
class PurgeCounts:
    notifications: int
    messages: int
    translations: int
    completions: int
    occurrences: int
    templates: int
    gallery: int
    issues: int
    stages: int
    products: int
    departments: int
    invitations: int
    users: int
    branches: int
    networks: int


def _fetch_ids(db: Session, stmt) -> list:
    return list(db.execute(stmt).scalars().all())


def _ids_in(db: Session, model, col, parent_ids: list) -> list:
    if not parent_ids:
        return []
    return _fetch_ids(db, select(model.id).where(col.in_(parent_ids)))


def collect_network_scope(db: Session, network_id: str) -> NetworkScope:
    nid = mp.parse_uuid(network_id)
    branch_ids = _fetch_ids(db, select(orm.Branch.id).where(orm.Branch.network_id == nid))
    user_conds = [orm.User.network_id == nid]
    if branch_ids:
        user_conds.append(orm.User.branch_id.in_(branch_ids))
    return NetworkScope(
        network_id=nid,
        branch_ids=branch_ids,
        dept_ids=_ids_in(db, orm.Department, orm.Department.branch_id, branch_ids),
        user_ids=_fetch_ids(db, select(orm.User.id).where(or_(*user_conds))),
        occ_ids=_ids_in(db, orm.TaskOccurrence, orm.TaskOccurrence.branch_id, branch_ids),
        tpl_ids=_ids_in(db, orm.TaskTemplate, orm.TaskTemplate.branch_id, branch_ids),
        issue_ids=_ids_in(db, orm.IssueReport, orm.IssueReport.branch_id, branch_ids),
        gallery_ids=_fetch_ids(
            db, select(orm.TaskGalleryItem.id).where(orm.TaskGalleryItem.network_id == nid)
        ),
    )


def _delete(db: Session, stmt) -> int:
    return int(db.execute(stmt).rowcount or 0)


def _delete_ids(db: Session, model, ids: list) -> int:
    if not ids:
        return 0
    return _delete(db, delete(model).where(model.id.in_(ids)))


def _notification_clause(scope: NetworkScope):
    conds = []
    if scope.user_ids:
        conds.append(orm.UserNotification.user_id.in_(scope.user_ids))
    if scope.occ_ids:
        conds.append(orm.UserNotification.occurrence_id.in_(scope.occ_ids))
    if scope.issue_ids:
        conds.append(orm.UserNotification.issue_report_id.in_(scope.issue_ids))
    if scope.branch_ids:
        conds.append(orm.UserNotification.branch_id.in_(scope.branch_ids))
    return or_(*conds) if conds else None


def _invitation_clause(scope: NetworkScope):
    conds = [orm.UserInvitation.network_id == scope.network_id]
    if scope.branch_ids:
        conds.append(orm.UserInvitation.branch_id.in_(scope.branch_ids))
    if scope.user_ids:
        conds.append(orm.UserInvitation.invited_by_id.in_(scope.user_ids))
    return or_(*conds)


def _purge_task_children(db: Session, scope: NetworkScope) -> tuple[int, int, int, int]:
    clause = _notification_clause(scope)
    notif = _delete(db, delete(orm.UserNotification).where(clause)) if clause is not None else 0
    msgs = _delete_ids_col(db, orm.TaskMessage, orm.TaskMessage.occurrence_id, scope.occ_ids)
    trans = _delete_ids_col(
        db, orm.TaskOccurrenceTranslation, orm.TaskOccurrenceTranslation.occurrence_id, scope.occ_ids
    )
    comps = _delete_ids_col(
        db, orm.TaskCompletion, orm.TaskCompletion.occurrence_id, scope.occ_ids
    )
    return notif, msgs, trans, comps


def _delete_ids_col(db: Session, model, col, ids: list) -> int:
    if not ids:
        return 0
    return _delete(db, delete(model).where(col.in_(ids)))


def _purge_catalog(db: Session, scope: NetworkScope) -> tuple[int, int, int, int, int]:
    occ = _delete_ids(db, orm.TaskOccurrence, scope.occ_ids)
    tpl = _delete_ids(db, orm.TaskTemplate, scope.tpl_ids)
    gal = _delete_ids(db, orm.TaskGalleryItem, scope.gallery_ids)
    issues = _delete_ids(db, orm.IssueReport, scope.issue_ids)
    stages = _delete_ids_col(
        db, orm.PromotionStage, orm.PromotionStage.branch_id, scope.branch_ids
    )
    return occ, tpl, gal, issues, stages


def _purge_org(db: Session, scope: NetworkScope) -> tuple[int, int, int, int, int]:
    mem_conds = []
    if scope.user_ids:
        mem_conds.append(orm.UserBranchMembership.user_id.in_(scope.user_ids))
    if scope.branch_ids:
        mem_conds.append(orm.UserBranchMembership.branch_id.in_(scope.branch_ids))
    if mem_conds:
        _delete(db, delete(orm.UserBranchMembership).where(or_(*mem_conds)))
    products = _delete_ids_col(db, orm.Product, orm.Product.department_id, scope.dept_ids)
    depts = _delete_ids(db, orm.Department, scope.dept_ids)
    invitations = _delete(db, delete(orm.UserInvitation).where(_invitation_clause(scope)))
    users = _delete_ids(db, orm.User, scope.user_ids)
    branches = _delete_ids(db, orm.Branch, scope.branch_ids)
    return products, depts, invitations, users, branches


def purge_network(db: Session, network_id: str) -> PurgeCounts:
    scope = collect_network_scope(db, network_id)
    notif, msgs, trans, comps = _purge_task_children(db, scope)
    occ, tpl, gal, issues, stages = _purge_catalog(db, scope)
    products, depts, invitations, users, branches = _purge_org(db, scope)
    networks = _delete(db, delete(orm.Network).where(orm.Network.id == scope.network_id))
    return PurgeCounts(
        notifications=notif,
        messages=msgs,
        translations=trans,
        completions=comps,
        occurrences=occ,
        templates=tpl,
        gallery=gal,
        issues=issues,
        stages=stages,
        products=products,
        departments=depts,
        invitations=invitations,
        users=users,
        branches=branches,
        networks=networks,
    )


def _n(db: Session, model, col, ids: list) -> int:
    if not ids:
        return 0
    return int(
        db.execute(select(func.count()).select_from(model).where(col.in_(ids))).scalar_one()
    )


def _n_where(db: Session, model, clause) -> int:
    if clause is None:
        return 0
    return int(db.execute(select(func.count()).select_from(model).where(clause)).scalar_one())


def preview_network_purge(db: Session, network_id: str) -> PurgeCounts:
    scope = collect_network_scope(db, network_id)
    return PurgeCounts(
        notifications=_n_where(db, orm.UserNotification, _notification_clause(scope)),
        messages=_n(db, orm.TaskMessage, orm.TaskMessage.occurrence_id, scope.occ_ids),
        translations=_n(
            db, orm.TaskOccurrenceTranslation, orm.TaskOccurrenceTranslation.occurrence_id, scope.occ_ids
        ),
        completions=_n(db, orm.TaskCompletion, orm.TaskCompletion.occurrence_id, scope.occ_ids),
        occurrences=len(scope.occ_ids),
        templates=len(scope.tpl_ids),
        gallery=len(scope.gallery_ids),
        issues=len(scope.issue_ids),
        stages=_n(db, orm.PromotionStage, orm.PromotionStage.branch_id, scope.branch_ids),
        products=_n(db, orm.Product, orm.Product.department_id, scope.dept_ids),
        departments=len(scope.dept_ids),
        invitations=_n_where(db, orm.UserInvitation, _invitation_clause(scope)),
        users=len(scope.user_ids),
        branches=len(scope.branch_ids),
        networks=1,
    )
