import re
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator
from .skill import SkillSchema, SkillSaveSchema

TAG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _validate_tags(tags: list[str] | None) -> list[str] | None:
    if tags is None:
        return None
    if len(tags) > 10:
        raise ValueError("Maximum 10 tags autorisés")
    cleaned = []
    seen = set()
    for tag in tags:
        t = tag.strip().lower()
        if not t:
            continue
        if len(t) > 30:
            raise ValueError(f"Le tag '{t}' dépasse 30 caractères")
        if not TAG_PATTERN.match(t):
            raise ValueError(
                f"Le tag '{t}' contient des caractères invalides (alphanumériques et tirets uniquement)"
            )
        if t not in seen:
            seen.add(t)
            cleaned.append(t)
    return cleaned


def _tags_from_orm(obj: object) -> list[str]:
    """Extract tag names from ORM Tag objects."""
    tags = getattr(obj, "tags", None)
    if tags is None:
        return []
    return [t.name for t in tags]


class SkillTreeSimpleSchema(BaseModel):
    """Schema representing a skill tree in simple format."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str | None = None
    creator_username: str
    created_at: datetime
    tags: list[str] = Field(default_factory=list)

    @field_validator("tags", mode="before")
    @classmethod
    def extract_tags(cls, v: object, info: object) -> list[str]:
        if isinstance(v, list) and v and hasattr(v[0], "name"):
            return [t.name for t in v]
        return v if v is not None else []


class SkillTreeDetailSchema(BaseModel):
    """Schema representing a skill tree for detail page."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str | None = None
    creator_username: str
    created_at: datetime
    skills: list[SkillSchema]
    tags: list[str] = Field(default_factory=list)

    @field_validator("tags", mode="before")
    @classmethod
    def extract_tags(cls, v: object, info: object) -> list[str]:
        if isinstance(v, list) and v and hasattr(v[0], "name"):
            return [t.name for t in v]
        return v if v is not None else []


class SkillTreeSaveSchema(BaseModel):
    """Schema representing a skill tree for detail page."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    creator_username: str
    skills: list[SkillSaveSchema]
    tags: list[str] = Field(default_factory=list)

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: list[str]) -> list[str]:
        return _validate_tags(v) or []


class SkillTreeCreateWithoutUsernameSchema(BaseModel):
    """Schema for creating a new skill tree without specifying the creator's username."""

    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    tags: list[str] = Field(default_factory=list)

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: list[str]) -> list[str]:
        return _validate_tags(v) or []


class SkillTreeCreateSchema(BaseModel):
    """Schema for creating a new skill tree."""

    name: str
    description: str | None = None
    creator_username: str
    tags: list[str] = Field(default_factory=list)


class SkillTreeUpdateSchema(BaseModel):
    """Schema for updating an existing skill tree."""

    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None
    tags: list[str] | None = None

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: list[str] | None) -> list[str] | None:
        return _validate_tags(v)
