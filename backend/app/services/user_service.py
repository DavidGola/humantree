# /backend/app/services/user_service.py

from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select, delete
from app.models.user_check_skill import UserCheckSkill
from app.models.user_favorite_trees import UserFavoriteTrees
from fastapi import HTTPException, logger

from app.schemas.user import (
    UserSchema,
    UserUpdateSchema,
    UserCreateSchema,
    UserLoginSchema,
    UserCheckSkillsSchema,
    UserPublicSchema,
    UserFavoriteTreesSchema,
)
from app.models.user import User


from bcrypt import hashpw, gensalt, checkpw


async def register_user(db: AsyncSession, user: UserCreateSchema) -> UserSchema:
    """Enregistre un nouvel utilisateur dans la base de données."""
    # Vérifier si l'email existe déjà

    if await check_user_email(db, user.email):
        raise HTTPException(status_code=409, detail="Email already registered")

    if await check_user_username(db, user.username):
        raise HTTPException(status_code=409, detail="Username already taken")

    new_user = User(
        username=user.username,
        email=user.email,
        password_hash=hashpw(user.password.encode("utf-8"), gensalt()).decode(
            "utf-8"
        ),  # Assurez-vous de hasher le mot de passe
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return UserSchema.model_validate(new_user)


async def authenticate_user(
    db: AsyncSession, user_login: UserLoginSchema
) -> UserSchema | None:
    """Authentifie un utilisateur en vérifiant son email et mot de passe."""
    stmt = select(User).where(
        (User.email == user_login.email_or_username)
        | (User.username == user_login.email_or_username)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if user and checkpw(
        user_login.password.encode("utf-8"), user.password_hash.encode("utf-8")
    ):  # Vérifiez le mot de passe
        return UserSchema.model_validate(user)
    return None


async def get_user_skills_checked(
    db: AsyncSession, user_id: int
) -> UserCheckSkillsSchema:
    """Récupère la liste des IDs de compétences acquises par l'utilisateur."""
    stmt = select(UserCheckSkill.skill_id).where(UserCheckSkill.user_id == user_id)
    result = await db.execute(stmt)
    skill_ids = result.scalars().all()
    return UserCheckSkillsSchema(user_id=user_id, skill_ids=list(skill_ids))


async def add_user_skill_checked(db: AsyncSession, user_id: int, skill_id: int) -> None:
    """Ajoute une compétence acquise pour un utilisateur."""
    new_check = UserCheckSkill(user_id=user_id, skill_id=skill_id)
    db.add(new_check)
    await db.commit()


async def remove_user_skill_checked(
    db: AsyncSession, user_id: int, skill_id: int
) -> None:
    """Supprime une compétence acquise pour un utilisateur."""
    stmt = delete(UserCheckSkill).where(
        UserCheckSkill.user_id == user_id, UserCheckSkill.skill_id == skill_id
    )
    await db.execute(stmt)
    await db.commit()


async def update_user(
    db: AsyncSession, user_id: int, data: UserUpdateSchema
) -> UserSchema | None:
    """Met à jour les informations d'un utilisateur existant dans la base de données."""
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None:
        return None

    if data.username is not None:
        if await check_user_username(db, data.username):
            raise HTTPException(status_code=409, detail="Username already taken")
        user.username = data.username
    if data.email is not None:
        # Vérifier si le nouvel email existe déjà pour un autre utilisateur

        if await check_user_email(db, data.email):
            raise HTTPException(status_code=409, detail="Email already registered")
        user.email = data.email
    if data.password is not None:
        user.password_hash = hashpw(data.password.encode("utf-8"), gensalt()).decode(
            "utf-8"
        )

    await db.commit()
    await db.refresh(user)

    return UserSchema.model_validate(user)


async def check_user_email(db: AsyncSession, email: str) -> bool:
    """Vérifie si un email est conforme et s'il est déjà enregistré dans la base de données."""
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()
    return existing_user is not None


async def check_user_username(db: AsyncSession, username: str) -> bool:
    """Vérifie si un nom d'utilisateur est déjà enregistré dans la base de données."""
    stmt = select(User).where(User.username == username)
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()
    return existing_user is not None


async def get_user_username(db: AsyncSession, user_id: int) -> str | None:
    """Récupère le nom d'utilisateur d'un utilisateur à partir de son ID."""
    stmt = select(User.username).where(User.id == user_id)
    result = await db.execute(stmt)
    username = result.scalar_one_or_none()
    return username


async def get_user_public_by_username(
    db: AsyncSession, username: str
) -> UserPublicSchema | None:
    """Récupère les détails d'un utilisateur à partir de son nom d'utilisateur."""
    stmt = select(User).where(User.username == username)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if user:
        return UserPublicSchema.model_validate(user)
    return None


async def get_user_by_id(db: AsyncSession, user_id: int) -> UserSchema | None:
    """Récupère les détails d'un utilisateur à partir de son ID."""

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if user:
        return UserSchema.model_validate(user)
    return None
