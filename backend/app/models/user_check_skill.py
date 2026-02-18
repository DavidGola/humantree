from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import ForeignKey, UniqueConstraint
from datetime import datetime
from app.models.base_model import BaseModel


class UserCheckSkill(BaseModel):
    """Model representing a user's checked/acquired skill."""

    __tablename__ = "user_check_skill"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "skill_id", name="user_check_skill_user_id_skill_id_key"
        ),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(server_default="now()")
