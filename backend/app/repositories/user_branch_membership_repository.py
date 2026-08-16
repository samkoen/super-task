"""Repository memberships user ↔ snif."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp


class UserBranchMembershipRepository:
    def __init__(self, db: Session):
        self._db = db

    def list_branch_ids_for_user(self, user_id: str) -> list[str]:
        try:
            uid = mp.parse_uuid(user_id)
        except ValueError:
            return []
        rows = self._db.execute(
            select(orm.UserBranchMembership.branch_id)
            .where(orm.UserBranchMembership.user_id == uid)
            .order_by(orm.UserBranchMembership.is_primary.desc(), orm.UserBranchMembership.created_at)
        ).scalars().all()
        return [str(b) for b in rows if b]

    def list_for_user(self, user_id: str) -> list[dict]:
        try:
            uid = mp.parse_uuid(user_id)
        except ValueError:
            return []
        rows = self._db.execute(
            select(orm.UserBranchMembership, orm.Branch.name)
            .join(orm.Branch, orm.Branch.id == orm.UserBranchMembership.branch_id)
            .where(orm.UserBranchMembership.user_id == uid)
            .order_by(orm.UserBranchMembership.is_primary.desc(), orm.Branch.name)
        ).all()
        out: list[dict] = []
        for membership, name in rows:
            out.append(
                {
                    "branch_id": str(membership.branch_id),
                    "branch_name": name,
                    "is_primary": bool(membership.is_primary),
                }
            )
        return out

    def ensure_membership(
        self,
        user_id: str,
        branch_id: str,
        *,
        is_primary: bool = False,
    ) -> None:
        uid = mp.parse_uuid(user_id)
        bid = mp.parse_uuid(branch_id)
        existing = self._db.execute(
            select(orm.UserBranchMembership)
            .where(orm.UserBranchMembership.user_id == uid)
            .where(orm.UserBranchMembership.branch_id == bid)
        ).scalar_one_or_none()
        if existing:
            if is_primary and not existing.is_primary:
                self._clear_primary(uid)
                existing.is_primary = True
            self._db.flush()
            return
        if is_primary:
            self._clear_primary(uid)
        self._db.add(
            orm.UserBranchMembership(
                id=uuid.uuid4(),
                user_id=uid,
                branch_id=bid,
                is_primary=is_primary,
            )
        )
        self._db.flush()

    def remove_membership(self, user_id: str, branch_id: str) -> None:
        uid = mp.parse_uuid(user_id)
        bid = mp.parse_uuid(branch_id)
        row = self._db.execute(
            select(orm.UserBranchMembership)
            .where(orm.UserBranchMembership.user_id == uid)
            .where(orm.UserBranchMembership.branch_id == bid)
        ).scalar_one_or_none()
        if not row:
            return
        was_primary = row.is_primary
        self._db.delete(row)
        self._db.flush()
        if was_primary:
            first = self._db.execute(
                select(orm.UserBranchMembership)
                .where(orm.UserBranchMembership.user_id == uid)
                .order_by(orm.UserBranchMembership.created_at)
                .limit(1)
            ).scalar_one_or_none()
            if first:
                first.is_primary = True
                self._db.flush()

    def list_user_ids_for_branches(self, branch_ids: list[str]) -> list[str]:
        if not branch_ids:
            return []
        uuids = [mp.parse_uuid(b) for b in branch_ids]
        rows = self._db.execute(
            select(orm.UserBranchMembership.user_id)
            .where(orm.UserBranchMembership.branch_id.in_(uuids))
            .distinct()
        ).scalars().all()
        return [str(u) for u in rows if u]

    def _clear_primary(self, user_uuid: uuid.UUID) -> None:
        rows = self._db.execute(
            select(orm.UserBranchMembership).where(
                orm.UserBranchMembership.user_id == user_uuid
            )
        ).scalars().all()
        for row in rows:
            row.is_primary = False
