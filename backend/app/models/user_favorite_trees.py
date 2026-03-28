from datetime import datetime

from sqlalchemy import ForeignKey, PrimaryKeyConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base_model import BaseModel


class UserFavoriteTrees(BaseModel):
    """Model representing a user's favorite trees."""

    __tablename__ = "user_favorite_trees"
    __table_args__ = (PrimaryKeyConstraint("user_id", "skill_tree_id", name="user_favorite_trees_pk"),)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    skill_tree_id: Mapped[int] = mapped_column(ForeignKey("skill_trees.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
