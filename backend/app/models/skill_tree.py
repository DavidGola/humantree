from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, ForeignKey, text
from datetime import datetime
from app.models.base_model import BaseModel
from .skill import Skill
from .tag import Tag, SkillTreeTag


class SkillTree(BaseModel):
    """Model representing a skill tree."""

    __tablename__ = "skill_trees"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    creator_username: Mapped[str] = mapped_column(
        ForeignKey("users.username", ondelete="CASCADE")
    )
    created_at: Mapped[datetime] = mapped_column(
        server_default=text("CURRENT_TIMESTAMP")
    )

    skills: Mapped[list["Skill"]] = relationship(cascade="all, delete-orphan")
    tags: Mapped[list["Tag"]] = relationship(
        secondary="skill_tree_tags",
        lazy="selectin",
    )
