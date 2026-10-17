"""a061 — deux lectures au plus par הזמנה : la première, et la dernière si elle change."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a061_order_readings"
down_revision: Union[str, None] = "a060_agroline_orders"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "agroline_orders",
        sa.Column("reading_kind", sa.String(length=16), nullable=False, server_default="first"),
    )
    op.add_column("agroline_orders", sa.Column("pdf_sha256", sa.String(length=64), nullable=True))
    op.add_column(
        "agroline_orders",
        sa.Column(
            "read_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.drop_constraint("agroline_orders_agroline_number_key", "agroline_orders", type_="unique")
    op.create_unique_constraint(
        "uq_agroline_order_reading", "agroline_orders", ["agroline_number", "reading_kind"]
    )
    op.create_index("ix_agroline_orders_agroline_number", "agroline_orders", ["agroline_number"])


def downgrade() -> None:
    op.drop_index("ix_agroline_orders_agroline_number", table_name="agroline_orders")
    op.drop_constraint("uq_agroline_order_reading", "agroline_orders", type_="unique")
    op.create_unique_constraint("agroline_orders_agroline_number_key", "agroline_orders", ["agroline_number"])
    op.drop_column("agroline_orders", "read_at")
    op.drop_column("agroline_orders", "pdf_sha256")
    op.drop_column("agroline_orders", "reading_kind")
