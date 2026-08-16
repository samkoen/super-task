"""a030 — rattachements multi-snif (user_branch_memberships)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a030_user_branch_memberships"
down_revision: Union[str, None] = "a029_task_opened_on"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_branch_memberships",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("branch_id", sa.Uuid(), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["branch_id"], ["branches.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "branch_id", name="uq_user_branch_membership"),
    )
    op.create_index(
        "ix_user_branch_memberships_user_id",
        "user_branch_memberships",
        ["user_id"],
    )
    op.create_index(
        "ix_user_branch_memberships_branch_id",
        "user_branch_memberships",
        ["branch_id"],
    )
    # Backfill depuis users.branch_id (snif primaire historique).
    op.execute(
        sa.text(
            """
            INSERT INTO user_branch_memberships (id, user_id, branch_id, is_primary, created_at)
            SELECT gen_random_uuid(), id, branch_id, true, now()
            FROM users
            WHERE branch_id IS NOT NULL
            ON CONFLICT DO NOTHING
            """
        )
    )


def downgrade() -> None:
    op.drop_index("ix_user_branch_memberships_branch_id", table_name="user_branch_memberships")
    op.drop_index("ix_user_branch_memberships_user_id", table_name="user_branch_memberships")
    op.drop_table("user_branch_memberships")
