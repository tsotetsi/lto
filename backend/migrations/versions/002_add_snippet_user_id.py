"""Add user_id foreign key to snippets table for per-user snippet ownership

Revision ID: 002
Revises: 001
Create Date: 2026-07-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "snippets",
        sa.Column("user_id", sa.UUID(), nullable=True),
    )
    op.create_index(op.f("ix_snippets_user_id"), "snippets", ["user_id"])
    op.create_foreign_key(
        "fk_snippets_user_id",
        "snippets",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_snippets_user_id", "snippets", type_="foreignkey")
    op.drop_index(op.f("ix_snippets_user_id"), table_name="snippets")
    op.drop_column("snippets", "user_id")
