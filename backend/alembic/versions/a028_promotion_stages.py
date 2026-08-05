"""a028 promotion stages (במות מבצעים)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a028_promotion_stages"
down_revision: Union[str, None] = "a027_task_message_i18n"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "promotion_stages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("branch_id", sa.Uuid(), nullable=False),
        sa.Column("department_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("location_label", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("assignee_user_id", sa.Uuid(), nullable=True),
        sa.Column("lead_product_name", sa.String(length=300), nullable=False, server_default=""),
        sa.Column("stock_pct", sa.Float(), nullable=False, server_default="100"),
        sa.Column("signage_status", sa.String(length=32), nullable=False, server_default="ok"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["assignee_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["branch_id"], ["branches.id"]),
        sa.ForeignKeyConstraint(["department_id"], ["departments.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_promotion_stages_branch_id", "promotion_stages", ["branch_id"])
    op.create_index("ix_promotion_stages_department_id", "promotion_stages", ["department_id"])
    op.create_index("ix_promotion_stages_assignee_user_id", "promotion_stages", ["assignee_user_id"])


def downgrade() -> None:
    op.drop_index("ix_promotion_stages_assignee_user_id", table_name="promotion_stages")
    op.drop_index("ix_promotion_stages_department_id", table_name="promotion_stages")
    op.drop_index("ix_promotion_stages_branch_id", table_name="promotion_stages")
    op.drop_table("promotion_stages")
