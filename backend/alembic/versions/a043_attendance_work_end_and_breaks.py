"""a043 — is_work_end + historique des הפסקות."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "a043_attendance_work_end"
down_revision: Union[str, None] = "a042_user_excellence_slogan"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(table: str) -> set[str]:
    return {col["name"] for col in inspect(op.get_bind()).get_columns(table)}


def _tables() -> set[str]:
    return set(inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    if "is_work_end" not in _columns("task_templates"):
        op.add_column(
            "task_templates",
            sa.Column(
                "is_work_end",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )
    if "is_work_end" not in _columns("task_occurrences"):
        op.add_column(
            "task_occurrences",
            sa.Column(
                "is_work_end",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )
    if "employee_break_intervals" not in _tables():
        op.create_table(
            "employee_break_intervals",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_employee_break_intervals_user_id",
            "employee_break_intervals",
            ["user_id"],
        )
        op.create_index(
            "ix_employee_break_intervals_started_at",
            "employee_break_intervals",
            ["started_at"],
        )


def downgrade() -> None:
    tables = _tables()
    if "employee_break_intervals" in tables:
        op.drop_index(
            "ix_employee_break_intervals_started_at",
            table_name="employee_break_intervals",
        )
        op.drop_index(
            "ix_employee_break_intervals_user_id",
            table_name="employee_break_intervals",
        )
        op.drop_table("employee_break_intervals")
    if "is_work_end" in _columns("task_occurrences"):
        op.drop_column("task_occurrences", "is_work_end")
    if "is_work_end" in _columns("task_templates"):
        op.drop_column("task_templates", "is_work_end")
