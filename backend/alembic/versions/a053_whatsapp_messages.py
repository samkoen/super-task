"""a053 — historique des envois WhatsApp via Brevo."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "a053_whatsapp_messages"
down_revision: Union[str, None] = "a052_app_releases"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLE = "whatsapp_messages"


def upgrade() -> None:
    if _TABLE in inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        _TABLE,
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("sent_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("recipient_user_id", sa.Uuid(), nullable=True),
        sa.Column("recipient_name", sa.String(length=120), nullable=False),
        sa.Column("recipient_phone", sa.String(length=20), nullable=False),
        sa.Column("template_key", sa.String(length=80), nullable=False),
        sa.Column("variables", sa.JSON(), nullable=False),
        sa.Column("brevo_message_id", sa.String(length=120), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("error", sa.String(length=500), nullable=True),
        sa.Column("consent_confirmed", sa.Boolean(), nullable=False),
        sa.Column("consent_confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["sent_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["recipient_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_whatsapp_messages_sent_by_user_id", _TABLE, ["sent_by_user_id"])
    op.create_index("ix_whatsapp_messages_recipient_user_id", _TABLE, ["recipient_user_id"])
    op.create_index("ix_whatsapp_messages_status", _TABLE, ["status"])


def downgrade() -> None:
    if _TABLE in inspect(op.get_bind()).get_table_names():
        op.drop_table(_TABLE)
