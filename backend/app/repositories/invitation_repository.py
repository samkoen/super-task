from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp
from app.domain import invitation_status
from app.models.invitation import UserInvitation


class InvitationRepository:
    def __init__(self, db: Session):
        self._db = db

    def find_by_id(self, id_: str) -> UserInvitation | None:
        try:
            uid = mp.parse_uuid(id_)
        except ValueError:
            return None
        row = self._db.get(orm.UserInvitation, uid)
        return mp.invitation_orm_to_domain(row)

    def find_pending_by_email(self, email: str) -> UserInvitation | None:
        row = self._db.execute(
            select(orm.UserInvitation).where(
                orm.UserInvitation.email == email.lower().strip(),
                orm.UserInvitation.status == invitation_status.PENDING,
            )
        ).scalar_one_or_none()
        return mp.invitation_orm_to_domain(row) if row else None

    def list_invitations(self, *, invited_by_id: str | None = None) -> list[UserInvitation]:
        q = select(orm.UserInvitation).order_by(orm.UserInvitation.created_at.desc())
        if invited_by_id:
            q = q.where(orm.UserInvitation.invited_by_id == mp.parse_uuid(invited_by_id))
        rows = self._db.execute(q).scalars().all()
        return [inv for r in rows if (inv := mp.invitation_orm_to_domain(r))]

    def create(
        self,
        *,
        email: str,
        role: str,
        job_function: str | None,
        invited_by_id: str,
        expires_at: datetime,
        network_id: str | None = None,
        branch_id: str | None = None,
    ) -> UserInvitation:
        import uuid

        row = orm.UserInvitation(
            id=uuid.uuid4(),
            email=email.lower().strip(),
            role=role,
            job_function=job_function,
            network_id=mp.parse_uuid(network_id) if network_id else None,
            branch_id=mp.parse_uuid(branch_id) if branch_id else None,
            invited_by_id=mp.parse_uuid(invited_by_id),
            status=invitation_status.PENDING,
            expires_at=expires_at,
        )
        self._db.add(row)
        self._db.flush()
        inv = mp.invitation_orm_to_domain(row)
        assert inv is not None
        return inv

    def update_status(self, invitation_id: str, status: str) -> bool:
        try:
            uid = mp.parse_uuid(invitation_id)
        except ValueError:
            return False
        row = self._db.get(orm.UserInvitation, uid)
        if not row:
            return False
        row.status = status
        if status == invitation_status.ACCEPTED:
            row.accepted_at = datetime.now(timezone.utc)
        self._db.flush()
        return True
