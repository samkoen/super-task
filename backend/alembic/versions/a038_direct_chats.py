"""a038 — chat hors tâche (fils + messages + last-read)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a038_direct_chats"
down_revision: Union[str, None] = "a037_user_avatar"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "direct_conversations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("scope", sa.String(length=16), nullable=False),
        sa.Column("scope_id", sa.Uuid(), nullable=False),
        sa.Column("counterpart_user_id", sa.Uuid(), nullable=False),
        sa.Column("last_preview", sa.String(length=80), nullable=True),
        sa.Column("last_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_sender_user_id", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["counterpart_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["last_sender_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "scope",
            "scope_id",
            "counterpart_user_id",
            name="uq_direct_conversations_peer",
        ),
    )
    op.create_index("ix_direct_conversations_scope_id", "direct_conversations", ["scope", "scope_id"])
    op.create_table(
        "direct_messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("conversation_id", sa.Uuid(), nullable=False),
        sa.Column("sender_user_id", sa.Uuid(), nullable=False),
        sa.Column("body", sa.String(length=2000), nullable=True),
        sa.Column("photo_url", sa.String(length=1024), nullable=True),
        sa.Column("video_url", sa.String(length=1024), nullable=True),
        sa.Column("audio_url", sa.String(length=1024), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["conversation_id"], ["direct_conversations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sender_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_direct_messages_conversation_created",
        "direct_messages",
        ["conversation_id", "created_at"],
    )
    op.create_table(
        "direct_conversation_reads",
        sa.Column("conversation_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("last_read_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["direct_conversations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("conversation_id", "user_id"),
    )


def downgrade() -> None:
    op.drop_table("direct_conversation_reads")
    op.drop_index("ix_direct_messages_conversation_created", table_name="direct_messages")
    op.drop_table("direct_messages")
    op.drop_index("ix_direct_conversations_scope_id", table_name="direct_conversations")
    op.drop_table("direct_conversations")
