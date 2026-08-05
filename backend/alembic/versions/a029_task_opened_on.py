"""a029 opened_on — date d'ouverture immuable vs due_at (exécution)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a029_task_opened_on"
down_revision: Union[str, None] = "a028_promotion_stages"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("task_occurrences", sa.Column("opened_on", sa.Date(), nullable=True))
    # Backfill : date d'ouverture ≈ jour de création (fuseau serveur DB).
    op.execute(
        sa.text(
            "UPDATE task_occurrences "
            "SET opened_on = CAST(created_at AS date) "
            "WHERE opened_on IS NULL"
        )
    )
    # Sécurité si created_at manquant (ne devrait pas arriver).
    op.execute(
        sa.text(
            "UPDATE task_occurrences "
            "SET opened_on = CAST(due_at AS date) "
            "WHERE opened_on IS NULL"
        )
    )
    op.alter_column("task_occurrences", "opened_on", nullable=False)
    op.create_index("ix_task_occurrences_opened_on", "task_occurrences", ["opened_on"])


def downgrade() -> None:
    op.drop_index("ix_task_occurrences_opened_on", table_name="task_occurrences")
    op.drop_column("task_occurrences", "opened_on")
