"""Migration user_invitations + job_function sur users."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a003_user_invitations"
down_revision: Union[str, None] = "a002_email_verified"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("job_function", sa.String(32), nullable=True))
    op.add_column("users", sa.Column("snif_id", sa.Uuid(), nullable=True))
    op.create_table(
        "user_invitations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("job_function", sa.String(32), nullable=True),
        sa.Column("invited_by_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_invitations_email", "user_invitations", ["email"])


def downgrade() -> None:
    op.drop_index("ix_user_invitations_email", table_name="user_invitations")
    op.drop_table("user_invitations")
    op.drop_column("users", "snif_id")
    op.drop_column("users", "job_function")
