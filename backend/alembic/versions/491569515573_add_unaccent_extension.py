"""add unaccent extension

Revision ID: 491569515573
Revises: 1f43b41bf5b1
Create Date: 2026-03-31 16:03:12.363707

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "491569515573"
down_revision: str | Sequence[str] | None = "1f43b41bf5b1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP EXTENSION IF EXISTS unaccent")
