"""Migration — scope רשת/סניף sur invitations et users."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a005_user_scope"
down_revision: Union[str, None] = "a004_referentials"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user_invitations", sa.Column("reshet_id", sa.Uuid(), nullable=True))
    op.add_column("user_invitations", sa.Column("snif_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_user_invitations_reshet_id", "user_invitations", "reshot", ["reshet_id"], ["id"]
    )
    op.create_foreign_key(
        "fk_user_invitations_snif_id", "user_invitations", "snifim", ["snif_id"], ["id"]
    )


def downgrade() -> None:
    op.drop_constraint("fk_user_invitations_snif_id", "user_invitations", type_="foreignkey")
    op.drop_constraint("fk_user_invitations_reshet_id", "user_invitations", type_="foreignkey")
    op.drop_column("user_invitations", "snif_id")
    op.drop_column("user_invitations", "reshet_id")
