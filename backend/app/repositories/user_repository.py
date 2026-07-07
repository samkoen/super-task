from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

import app.db.models as orm
from app.core.security import hash_password
from app.db import mappers as mp
from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self._db = db

    def find_by_id(self, id_: str) -> Optional[User]:
        try:
            uid = mp.parse_uuid(id_)
        except ValueError:
            return None
        row = self._db.get(orm.User, uid)
        return mp.user_orm_to_domain(row)

    def find_by_email(self, email: str) -> Optional[User]:
        row = self._db.execute(
            select(orm.User).where(orm.User.email == email.lower().strip())
        ).scalar_one_or_none()
        return mp.user_orm_to_domain(row) if row else None

    def get_user_and_password_hash(
        self, email: str
    ) -> tuple[Optional[User], Optional[str]]:
        row = self._db.execute(
            select(orm.User).where(orm.User.email == email.lower().strip())
        ).scalar_one_or_none()
        if not row:
            return None, None
        return mp.user_orm_to_domain(row), row.password_hash

    def list_users(
        self, role: str | None = None, *, branch_ids: list[str] | None = None
    ) -> list[User]:
        q = select(orm.User).order_by(orm.User.created_at.desc())
        if role:
            q = q.where(orm.User.role == role)
        if branch_ids is not None:
            q = q.where(orm.User.branch_id.in_([mp.parse_uuid(i) for i in branch_ids]))
        rows = self._db.execute(q).scalars().all()
        return [mp.user_orm_to_domain(r) for r in rows if r]

    def create_user(
        self,
        *,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        role: str = "employee",
        email_verified: bool = False,
        phone: str | None = None,
        job_function: str | None = None,
        network_id: str | None = None,
        branch_id: str | None = None,
    ) -> User:
        import uuid

        row = orm.User(
            id=uuid.uuid4(),
            email=email.lower().strip(),
            password_hash=hash_password(password),
            first_name=first_name,
            last_name=last_name,
            role=role,
            phone=phone,
            job_function=job_function,
            network_id=mp.parse_uuid(network_id) if network_id else None,
            branch_id=mp.parse_uuid(branch_id) if branch_id else None,
            is_active=True,
            email_verified=email_verified,
        )
        self._db.add(row)
        self._db.flush()
        user = mp.user_orm_to_domain(row)
        assert user is not None
        return user

    def create_admin(
        self,
        *,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
    ) -> User:
        return self.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role="admin",
            email_verified=True,
        )

    def mark_email_verified(self, user_id: str) -> bool:
        try:
            uid = mp.parse_uuid(user_id)
        except ValueError:
            return False
        row = self._db.get(orm.User, uid)
        if not row:
            return False
        row.email_verified = True
        self._db.flush()
        return True

    def count_by_email(self, email: str) -> int:
        return len(
            self._db.execute(
                select(orm.User).where(orm.User.email == email.lower().strip())
            ).scalars().all()
        )

    def find_by_branch_and_role(self, branch_id: str, role: str) -> User | None:
        try:
            q = (
                select(orm.User)
                .where(orm.User.branch_id == mp.parse_uuid(branch_id))
                .where(orm.User.role == role)
                .where(orm.User.is_active.is_(True))
                .limit(1)
            )
            row = self._db.execute(q).scalar_one_or_none()
            return mp.user_orm_to_domain(row) if row else None
        except ValueError:
            return None

    def find_network_manager(self, network_id: str) -> User | None:
        try:
            q = (
                select(orm.User)
                .where(orm.User.network_id == mp.parse_uuid(network_id))
                .where(orm.User.role == "network_manager")
                .where(orm.User.is_active.is_(True))
                .limit(1)
            )
            row = self._db.execute(q).scalar_one_or_none()
            return mp.user_orm_to_domain(row) if row else None
        except ValueError:
            return None

    def update_scope(
        self,
        user_id: str,
        *,
        network_id: str | None,
        branch_id: str | None,
    ) -> User | None:
        try:
            row = self._db.get(orm.User, mp.parse_uuid(user_id))
        except ValueError:
            return None
        if not row:
            return None
        row.network_id = mp.parse_uuid(network_id) if network_id else None
        row.branch_id = mp.parse_uuid(branch_id) if branch_id else None
        self._db.flush()
        return mp.user_orm_to_domain(row)

    def update_employee(
        self,
        user_id: str,
        *,
        first_name: str,
        last_name: str,
        email: str,
        phone: str | None = None,
        job_function: str | None = None,
        password: str | None = None,
    ) -> User | None:
        try:
            row = self._db.get(orm.User, mp.parse_uuid(user_id))
        except ValueError:
            return None
        if not row:
            return None
        row.first_name = first_name
        row.last_name = last_name
        row.email = email.lower().strip()
        row.phone = phone
        row.job_function = job_function
        if password:
            row.password_hash = hash_password(password)
        self._db.flush()
        return mp.user_orm_to_domain(row)

    def set_active(self, user_id: str, is_active: bool) -> User | None:
        try:
            row = self._db.get(orm.User, mp.parse_uuid(user_id))
        except ValueError:
            return None
        if not row:
            return None
        row.is_active = is_active
        self._db.flush()
        return mp.user_orm_to_domain(row)

    def update_password(self, user_id: str, password: str) -> User | None:
        try:
            row = self._db.get(orm.User, mp.parse_uuid(user_id))
        except ValueError:
            return None
        if not row:
            return None
        row.password_hash = hash_password(password)
        self._db.flush()
        return mp.user_orm_to_domain(row)
