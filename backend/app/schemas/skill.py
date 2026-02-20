from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator, Field


class SkillSchema(BaseModel):
    """Schema representing a skill."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str | None = None
    is_root: bool
    unlock_ids: list[int] = Field(default=[], validation_alias="unlocks")

    @field_validator("unlock_ids", mode="before")
    @classmethod
    def extract_unlock_ids(cls, v, info):
        """Extract unlock IDs from Skill model relationships."""
        if not v:
            return []
        unlock_ids = [
            skill.id for skill in v
        ]  # Assuming 'v' is a list of Skill model instances

        return unlock_ids


class SkillSimpleSchema(BaseModel):
    """Schema representing a skill."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str | None = None
    is_root: bool
    skill_tree_id: int


class SkillCreateSchema(BaseModel):
    """Schema for creating a new skill."""

    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    skill_tree_id: int


class SkillUpdateSchema(BaseModel):
    """Schema for updating an existing skill."""

    name: str | None = None
    description: str | None = None
    is_root: bool | None = None
    unlock_ids: list[int] = Field(default=[])


class SkillSaveSchema(BaseModel):
    """Schema for saving a skill with its dependencies."""

    id: int
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    is_root: bool
    unlock_ids: list[int] = Field(default=[])
