from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Text, ForeignKey, UniqueConstraint, func
from datetime import datetime
from app.models.base_model import BaseModel


class UserApiKey(BaseModel):
    """Model representing a user's API key for an AI provider."""

    __tablename__ = "user_api_keys"
    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_user_api_key_user_provider"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    provider: Mapped[str] = mapped_column(String(20))  # "anthropic" | "openai"
    encrypted_key: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
