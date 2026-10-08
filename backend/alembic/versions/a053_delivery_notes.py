"""a053 — תעודות משלוח : lien client, document, lignes, ouvertures."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "a053_delivery_notes"
down_revision: Union[str, None] = "a052_app_releases"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    tables = set(insp.get_table_names())
    _add_template_flag(insp, tables)
    _create_links(tables)
    _create_notes(tables)
    _create_lines(tables)
    _create_openings(tables)
    _create_answers(tables)
    _create_account(tables)


def downgrade() -> None:
    bind = op.get_bind()
    tables = set(inspect(bind).get_table_names())
    if "agroline_accounts" in tables:
        op.drop_table("agroline_accounts")
    if "delivery_line_answers" in tables:
        op.drop_table("delivery_line_answers")
    if "delivery_note_openings" in tables:
        op.drop_table("delivery_note_openings")
    if "delivery_note_lines" in tables:
        op.drop_table("delivery_note_lines")
    if "delivery_notes" in tables:
        op.drop_table("delivery_notes")
    if "agroline_branch_links" in tables:
        op.drop_table("agroline_branch_links")
    if "task_templates" in tables:
        cols = {col["name"] for col in inspect(bind).get_columns("task_templates")}
        if "opened_by_delivery_note" in cols:
            op.drop_column("task_templates", "opened_by_delivery_note")


def _add_template_flag(insp, tables: set[str]) -> None:
    if "task_templates" not in tables:
        return
    cols = {col["name"] for col in insp.get_columns("task_templates")}
    if "opened_by_delivery_note" in cols:
        return
    op.add_column(
        "task_templates",
        sa.Column(
            "opened_by_delivery_note",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def _create_links(tables: set[str]) -> None:
    if "agroline_branch_links" in tables:
        return
    op.create_table(
        "agroline_branch_links",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("customer_name", sa.String(length=200), nullable=False),
        sa.Column("branch_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["branch_id"], ["branches.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("customer_name"),
    )
    op.create_index("ix_agroline_branch_links_branch_id", "agroline_branch_links", ["branch_id"])


def _create_notes(tables: set[str]) -> None:
    if "delivery_notes" in tables:
        return
    op.create_table(
        "delivery_notes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("agroline_number", sa.String(length=32), nullable=False),
        sa.Column("branch_id", sa.Uuid(), nullable=False),
        sa.Column("customer_name", sa.String(length=200), nullable=False),
        sa.Column("document_date", sa.Date(), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("pdf_url", sa.String(length=1024), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["branch_id"], ["branches.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("agroline_number"),
    )
    op.create_index("ix_delivery_notes_branch_id", "delivery_notes", ["branch_id"])
    op.create_index("ix_delivery_notes_document_date", "delivery_notes", ["document_date"])


def _create_lines(tables: set[str]) -> None:
    if "delivery_note_lines" in tables:
        return
    op.create_table(
        "delivery_note_lines",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("delivery_note_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("product_name", sa.String(length=200), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(["delivery_note_id"], ["delivery_notes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("delivery_note_id", "position", name="uq_delivery_line_position"),
    )
    op.create_index("ix_delivery_note_lines_delivery_note_id", "delivery_note_lines", ["delivery_note_id"])


def _create_openings(tables: set[str]) -> None:
    if "delivery_note_openings" in tables:
        return
    op.create_table(
        "delivery_note_openings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("delivery_note_id", sa.Uuid(), nullable=False),
        sa.Column("template_id", sa.Uuid(), nullable=False),
        sa.Column("occurrence_id", sa.Uuid(), nullable=False),
        sa.Column("overall_status", sa.String(length=16), nullable=True),
        sa.ForeignKeyConstraint(["delivery_note_id"], ["delivery_notes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["template_id"], ["task_templates.id"]),
        sa.ForeignKeyConstraint(["occurrence_id"], ["task_occurrences.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("delivery_note_id", "template_id", name="uq_delivery_opening_model"),
        sa.UniqueConstraint("occurrence_id"),
    )
    op.create_index("ix_delivery_note_openings_delivery_note_id", "delivery_note_openings", ["delivery_note_id"])
    op.create_index("ix_delivery_note_openings_template_id", "delivery_note_openings", ["template_id"])


def _create_answers(tables: set[str]) -> None:
    if "delivery_line_answers" in tables:
        return
    op.create_table(
        "delivery_line_answers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("opening_id", sa.Uuid(), nullable=False),
        sa.Column("line_id", sa.Uuid(), nullable=False),
        sa.Column("arrival", sa.String(length=16), nullable=False),
        sa.Column("received_qty", sa.Float(), nullable=True),
        sa.Column("condition", sa.String(length=16), nullable=True),
        sa.Column("rejected_qty", sa.Float(), nullable=True),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.Column("photo_url", sa.String(length=1024), nullable=True),
        sa.ForeignKeyConstraint(["opening_id"], ["delivery_note_openings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["line_id"], ["delivery_note_lines.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("opening_id", "line_id", name="uq_delivery_line_answer"),
    )
    op.create_index("ix_delivery_line_answers_opening_id", "delivery_line_answers", ["opening_id"])


def _create_account(tables: set[str]) -> None:
    if "agroline_accounts" in tables:
        return
    op.create_table(
        "agroline_accounts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("username", sa.String(length=120), nullable=False),
        sa.Column("password_encrypted", sa.String(length=1024), nullable=False),
        sa.Column("is_internal", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
