"""add_embedding_and_search_vector

Revision ID: 1f43b41bf5b1
Revises: 15f420886d94
Create Date: 2026-03-30 10:09:00.883804

"""
from collections.abc import Sequence

import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import TSVECTOR

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '1f43b41bf5b1'
down_revision: str | Sequence[str] | None = '15f420886d94'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Add embedding column (384 dims for local multilingual model)
    op.add_column('skill_trees', sa.Column('embedding', Vector(384), nullable=True))

    # Add tsvector column for full-text search
    op.add_column('skill_trees', sa.Column('search_vector', TSVECTOR(), nullable=True))

    # HNSW index for fast approximate nearest neighbor search
    op.execute(
        "CREATE INDEX idx_skill_trees_embedding ON skill_trees "
        "USING hnsw (embedding vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )

    # GIN index for tsvector full-text search
    op.execute(
        "CREATE INDEX idx_skill_trees_search_vector ON skill_trees "
        "USING gin (search_vector)"
    )

    # Backfill tsvector for existing rows
    op.execute("""
        UPDATE skill_trees SET search_vector =
            setweight(to_tsvector('french', coalesce(name, '')), 'A') ||
            setweight(to_tsvector('french', coalesce(description, '')), 'B')
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("idx_skill_trees_search_vector", table_name="skill_trees")
    op.drop_index("idx_skill_trees_embedding", table_name="skill_trees")
    op.drop_column('skill_trees', 'search_vector')
    op.drop_column('skill_trees', 'embedding')
    op.execute("DROP EXTENSION IF EXISTS vector")
