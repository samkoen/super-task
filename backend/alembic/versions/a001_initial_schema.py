"""initial_schema

Revision ID: a001_initial
Revises:
Create Date: 2026-07-05
"""
from typing import Sequence, Union

from alembic import op

revision: str = "a001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.db.base import Base
    from app.db import models  # noqa: F401

    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    from app.db.base import Base

    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
