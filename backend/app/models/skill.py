from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, ForeignKey, UniqueConstraint, Index, func, text
from datetime import datetime
from app.models.base_model import BaseModel
from .skill_dependencies import SkillDependency


class Skill(BaseModel):
    """Model representing a skill."""

    __tablename__ = "skills"
    __table_args__ = (
        UniqueConstraint("name", "skill_tree_id", name="skills_name_skill_tree_id_key"),
        Index("idx_skills_skill_tree_id", "skill_tree_id"),
        Index(
            "unique_tree_skill_id_root",
            "skill_tree_id",
            "id",
            unique=True,
            postgresql_where=(mapped_column("is_root") == True),
        ),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    skill_tree_id: Mapped[int] = mapped_column(
        ForeignKey("skill_trees.id", ondelete="CASCADE")
    )
    is_root: Mapped[bool] = mapped_column(default=False, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    # Relationships
    unlocks: Mapped[list["Skill"]] = relationship(
        secondary=SkillDependency.__table__,
        primaryjoin=id == SkillDependency.skill_id,
        secondaryjoin=id == SkillDependency.unlock_id,
        foreign_keys=[SkillDependency.skill_id, SkillDependency.unlock_id],
    )
