"""Référentiels organisationnels."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a004_referentials"
down_revision: Union[str, None] = "a003_user_invitations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "reshot",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reshot_name", "reshot", ["name"])

    op.create_table(
        "snifim",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("reshet_id", sa.Uuid(), sa.ForeignKey("reshot.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("address", sa.String(255), nullable=False, server_default=""),
        sa.Column("city", sa.String(120), nullable=False, server_default=""),
        sa.Column("postal_code", sa.String(20), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_snifim_reshet_id", "snifim", ["reshet_id"])
    op.create_index("ix_snifim_name", "snifim", ["name"])

    op.create_table(
        "mahlekhot",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("snif_id", sa.Uuid(), sa.ForeignKey("snifim.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_mahlekhot_snif_id", "mahlekhot", ["snif_id"])

    op.create_table(
        "products",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("mahlekha_id", sa.Uuid(), sa.ForeignKey("mahlekhot.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("sku", sa.String(80), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_products_mahlekha_id", "products", ["mahlekha_id"])

    op.add_column("users", sa.Column("reshet_id", sa.Uuid(), nullable=True))
    op.create_foreign_key("fk_users_reshet_id", "users", "reshot", ["reshet_id"], ["id"])
    op.create_foreign_key("fk_users_snif_id", "users", "snifim", ["snif_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_users_snif_id", "users", type_="foreignkey")
    op.drop_constraint("fk_users_reshet_id", "users", type_="foreignkey")
    op.drop_column("users", "reshet_id")
    op.drop_table("products")
    op.drop_table("mahlekhot")
    op.drop_table("snifim")
    op.drop_table("reshot")
