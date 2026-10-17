"""a060 — הזמנות Agroline copiées (PDF) pour la tâche קריאת הזמנות."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a060_agroline_orders"
down_revision: Union[str, None] = "a059_line_audio"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agroline_orders",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("agroline_number", sa.String(length=32), nullable=False),
        sa.Column("branch_id", sa.Uuid(), nullable=True),
        sa.Column("customer_name", sa.String(length=200), nullable=False),
        sa.Column("document_date", sa.Date(), nullable=False),
        sa.Column("pdf_url", sa.String(length=1024), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["branch_id"], ["branches.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("agroline_number"),
    )
    op.create_index("ix_agroline_orders_branch_id", "agroline_orders", ["branch_id"])
    op.create_index("ix_agroline_orders_document_date", "agroline_orders", ["document_date"])


def downgrade() -> None:
    op.drop_index("ix_agroline_orders_document_date", table_name="agroline_orders")
    op.drop_index("ix_agroline_orders_branch_id", table_name="agroline_orders")
    op.drop_table("agroline_orders")
