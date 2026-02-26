from pydantic import BaseModel, Field


class AIGenerateTreeSchema(BaseModel):
    """Schema for AI tree generation request."""

    prompt: str = Field(..., min_length=1, max_length=500)
    provider: str | None = None  # Default: first configured key


class AIEnrichSkillSchema(BaseModel):
    """Schema for AI skill enrichment request."""

    skill_name: str = Field(..., min_length=1, max_length=100)
    tree_name: str | None = None  # Parent tree name
    tree_description: str | None = None  # Parent tree description
    current_description: str | None = None  # Existing skill description
    provider: str | None = None
