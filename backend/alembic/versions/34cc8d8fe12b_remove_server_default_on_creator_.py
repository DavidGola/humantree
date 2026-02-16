"""remove
  server_default on creator_username

Revision ID: 34cc8d8fe12b
Revises: 3494a0de6438
Create Date: 2026-02-10 22:00:09.626308

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "34cc8d8fe12b"
down_revision: Union[str, Sequence[str], None] = "3494a0de6438"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("skill_trees", "creator_username", server_default=None)


def downgrade() -> None:
    op.alter_column("skill_trees", "creator_username", server_default="admin")
