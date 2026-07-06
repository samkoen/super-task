"""Rename Hebrew transliteration tables/columns to English."""

from typing import Sequence, Union

from alembic import op

revision: str = "a008_english_schema_names"
down_revision: Union[str, None] = "a007_task_enhancements"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.rename_table("reshot", "networks")
    op.rename_table("snifim", "branches")
    op.rename_table("mahlekhot", "departments")

    op.execute("ALTER INDEX IF EXISTS ix_reshot_name RENAME TO ix_networks_name")
    op.execute("ALTER INDEX IF EXISTS ix_snifim_reshet_id RENAME TO ix_branches_network_id")
    op.execute("ALTER INDEX IF EXISTS ix_snifim_name RENAME TO ix_branches_name")
    op.execute("ALTER INDEX IF EXISTS ix_mahlekhot_snif_id RENAME TO ix_departments_branch_id")
    op.execute("ALTER INDEX IF EXISTS ix_products_mahlekha_id RENAME TO ix_products_department_id")
    op.execute("ALTER INDEX IF EXISTS ix_task_templates_snif_id RENAME TO ix_task_templates_branch_id")
    op.execute("ALTER INDEX IF EXISTS ix_task_occurrences_snif_id RENAME TO ix_task_occurrences_branch_id")

    op.alter_column("users", "reshet_id", new_column_name="network_id")
    op.alter_column("users", "snif_id", new_column_name="branch_id")

    op.alter_column("user_invitations", "reshet_id", new_column_name="network_id")
    op.alter_column("user_invitations", "snif_id", new_column_name="branch_id")

    op.alter_column("branches", "reshet_id", new_column_name="network_id")
    op.alter_column("departments", "snif_id", new_column_name="branch_id")
    op.alter_column("products", "mahlekha_id", new_column_name="department_id")

    op.alter_column("task_templates", "snif_id", new_column_name="branch_id")
    op.alter_column("task_templates", "mahlekha_id", new_column_name="department_id")
    op.alter_column("task_occurrences", "snif_id", new_column_name="branch_id")
    op.alter_column("task_occurrences", "mahlekha_id", new_column_name="department_id")


def downgrade() -> None:
    op.alter_column("task_occurrences", "department_id", new_column_name="mahlekha_id")
    op.alter_column("task_occurrences", "branch_id", new_column_name="snif_id")
    op.alter_column("task_templates", "department_id", new_column_name="mahlekha_id")
    op.alter_column("task_templates", "branch_id", new_column_name="snif_id")
    op.alter_column("products", "department_id", new_column_name="mahlekha_id")
    op.alter_column("departments", "branch_id", new_column_name="snif_id")
    op.alter_column("branches", "network_id", new_column_name="reshet_id")
    op.alter_column("user_invitations", "branch_id", new_column_name="snif_id")
    op.alter_column("user_invitations", "network_id", new_column_name="reshet_id")
    op.alter_column("users", "branch_id", new_column_name="snif_id")
    op.alter_column("users", "network_id", new_column_name="reshet_id")

    op.execute("ALTER INDEX IF EXISTS ix_task_occurrences_branch_id RENAME TO ix_task_occurrences_snif_id")
    op.execute("ALTER INDEX IF EXISTS ix_task_templates_branch_id RENAME TO ix_task_templates_snif_id")
    op.execute("ALTER INDEX IF EXISTS ix_products_department_id RENAME TO ix_products_mahlekha_id")
    op.execute("ALTER INDEX IF EXISTS ix_departments_branch_id RENAME TO ix_mahlekhot_snif_id")
    op.execute("ALTER INDEX IF EXISTS ix_branches_name RENAME TO ix_snifim_name")
    op.execute("ALTER INDEX IF EXISTS ix_branches_network_id RENAME TO ix_snifim_reshet_id")
    op.execute("ALTER INDEX IF EXISTS ix_networks_name RENAME TO ix_reshot_name")

    op.rename_table("departments", "mahlekhot")
    op.rename_table("branches", "snifim")
    op.rename_table("networks", "reshot")
