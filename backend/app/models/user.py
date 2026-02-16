from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Text
from datetime import datetime
from app.models.base_model import BaseModel


class User(BaseModel):
    """Model representing a user."""

    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(30), unique=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime | None] = mapped_column(server_default="now()")
