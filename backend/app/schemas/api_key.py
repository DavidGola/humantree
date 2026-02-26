from datetime import datetime
from pydantic import BaseModel, Field
from typing import Literal


class ApiKeyCreateSchema(BaseModel):
    """Schema for saving an API key."""

    provider: Literal["anthropic", "openai", "google"]
    api_key: str = Field(..., min_length=1)


class ApiKeyResponseSchema(BaseModel):
    """Schema for API key response (without the key itself)."""

    provider: str
    created_at: datetime
