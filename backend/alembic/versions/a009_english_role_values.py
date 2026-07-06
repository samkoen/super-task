"""Migrate role and job_function stored values to English."""

from typing import Sequence, Union

from alembic import op

revision: str = "a009_english_role_values"
down_revision: Union[str, None] = "a008_english_schema_names"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _update_roles(old: str, new: str) -> None:
    op.execute(f"UPDATE users SET role = '{new}' WHERE role = '{old}'")
    op.execute(f"UPDATE user_invitations SET role = '{new}' WHERE role = '{old}'")


def _update_job_functions(old: str, new: str) -> None:
    op.execute(f"UPDATE users SET job_function = '{new}' WHERE job_function = '{old}'")
    op.execute(f"UPDATE user_invitations SET job_function = '{new}' WHERE job_function = '{old}'")


def upgrade() -> None:
    _update_roles("menahel_reshet", "network_manager")
    _update_roles("menahel_snif", "branch_manager")
    _update_roles("oved", "employee")
    _update_job_functions("kupa_rashit", "head_cashier")
    _update_job_functions("sadranim", "stockers")
    _update_job_functions("machsanai", "warehouse_worker")


def downgrade() -> None:
    _update_job_functions("warehouse_worker", "machsanai")
    _update_job_functions("stockers", "sadranim")
    _update_job_functions("head_cashier", "kupa_rashit")
    _update_roles("employee", "oved")
    _update_roles("branch_manager", "menahel_snif")
    _update_roles("network_manager", "menahel_reshet")
