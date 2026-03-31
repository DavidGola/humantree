from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.constants import EMBEDDING_DIMENSIONS
from app.models.base_model import BaseModel

from .skill import Skill
from .tag import Tag


class SkillTree(BaseModel):
    """Model representing a skill tree."""

    __tablename__ = "skill_trees"
    __table_args__ = (
        Index(
            "idx_skill_trees_embedding",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
        Index("idx_skill_trees_search_vector", "search_vector", postgresql_using="gin"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    creator_username: Mapped[str] = mapped_column(ForeignKey("users.username", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(server_default=text("CURRENT_TIMESTAMP"))

    # Semantic search: embedding vector from local model
    embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIMENSIONS), nullable=True, default=None)
    # Full-text search: PostgreSQL tsvector
    search_vector = Column(TSVECTOR, nullable=True)

    skills: Mapped[list["Skill"]] = relationship(foreign_keys=[Skill.skill_tree_id], cascade="all, delete-orphan")
    tags: Mapped[list["Tag"]] = relationship(
        secondary="skill_tree_tags",
        lazy="selectin",
    )
