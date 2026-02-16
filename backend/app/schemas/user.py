from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator, Field


class UserSchema(BaseModel):
    """Schema representing a user."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: str
    created_at: datetime | None = None


class UserPublicSchema(BaseModel):
    """Schema representing public details of a user."""

    model_config = ConfigDict(from_attributes=True)
    username: str


class UserCreateSchema(BaseModel):
    """Schema for creating a new user."""

    username: str
    email: str = Field(
        ..., pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$"
    )  # Validation de l'email
    password: str = Field(
        ..., min_length=8
    )  # Validation du mot de passe (au moins 8 caractères)


class UserUpdateSchema(BaseModel):
    """Schema for updating an existing user."""

    username: str | None = None
    email: str | None = None
    password: str | None = None


class UserLoginSchema(BaseModel):
    """Schema for user login."""

    email_or_username: str
    password: str


class UserSkillsCheckedSchema(BaseModel):
    """Schema representing a user's checked/acquired skills."""

    user_id: int
    skill_ids: list[int] = Field(default=[])


class UserOneSkillCheckedSchema(BaseModel):
    """Schema representing a user's checked/acquired skills with details."""

    skill_id: int


class UserCheckSkillsSchema(BaseModel):
    """Schema representing a user's checked/acquired skill with details."""

    user_id: int
    skill_ids: list[int] = Field(default=[])
