from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import CheckConstraint, ForeignKey
from app.models.base_model import BaseModel


class SkillDependency(BaseModel):
    """Model representing a skill_dependency."""

    __tablename__ = "skill_dependencies"
    __table_args__ = (
        CheckConstraint("skill_id != unlock_id", name="skill_dependencies_check"),
    )
    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True
    )
    unlock_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True
    )
