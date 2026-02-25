from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from .skill import SkillSchema, SkillSaveSchema


class SkillTreeSimpleSchema(BaseModel):
    """Schema representing a skill tree in simple format."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str | None = None
    creator_username: str
    created_at: datetime


class SkillTreeDetailSchema(BaseModel):
    """Schema representing a skill tree for detail page."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str | None = None
    creator_username: str
    created_at: datetime
    skills: list[SkillSchema]


class SkillTreeSaveSchema(BaseModel):
    """Schema representing a skill tree for detail page."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    creator_username: str
    skills: list[SkillSaveSchema]


class SkillTreeCreateWithoutUsernameSchema(BaseModel):
    """Schema for creating a new skill tree without specifying the creator's username."""

    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None


class SkillTreeCreateSchema(BaseModel):
    """Schema for creating a new skill tree."""

    name: str
    description: str | None = None
    creator_username: str


class SkillTreeUpdateSchema(BaseModel):
    """Schema for updating an existing skill tree."""

    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None
