# /backend/app/routers/users.py

"""Router pour les endpoints liés aux users."""

# ========== IMPORTS ==========

# FastAPI core

from fastapi import APIRouter, Depends, Request
from fastapi import HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Cookie
from fastapi.responses import JSONResponse

from app.limiter import limiter

# SQLAlchemy
from sqlalchemy.ext.asyncio import AsyncSession

# Database
from app.database import get_db


# Services
from app.services.user_service import (
    register_user,
    authenticate_user,
    get_user_skills_checked,
    add_user_skill_checked,
    remove_user_skill_checked,
    get_user_public_by_username,
    get_user_by_id,
    update_user,
)

from app.services.auth_service import (
    create_jwt_token,
    get_current_user,
    refresh_jwt_token,
)

# Schemas
from app.schemas.user import (
    UserSchema,
    UserSkillsCheckedSchema,
    UserCreateSchema,
    UserLoginSchema,
    UserUpdateSchema,
    UserOneSkillCheckedSchema,
    UserPublicSchema,
    UserFavoriteTreesSchema,
)
from app.schemas.auth import JWTTokenSchema


# ========== CRÉATION DU ROUTER ==========
router = APIRouter(
    prefix="/users",
    tags=["Users"],  # Catégorie dans la doc Swagger
)


# ========== ENDPOINTS ==========
@router.post(
    "/register",
    response_model=UserSchema,
    summary="Register a new user",
    description="Create a new user account with username, email, and password",
)
@limiter.limit("3/minute")
async def register(
    request: Request,
    data: UserCreateSchema,
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint pour enregistrer un nouvel utilisateur.
    Args:
        username: Nom d'utilisateur
        email: Adresse email de l'utilisateur
        password: Mot de passe de l'utilisateur

    Returns:
        Détails de l'utilisateur enregistré au format UserSchema
    """
    return await register_user(db, data)


@router.post(
    "/login",
    summary="Authenticate user and get JWT token",
    description="Authenticate a user with email and password, and receive a JWT token for future requests",
)
@limiter.limit("5/minute")
async def login(
    request: Request,
    data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint pour authentifier un utilisateur et obtenir un token JWT.
    Args:
        email: Adresse email de l'utilisateur
        password: Mot de passe de l'utilisateur

    Returns:
        Un token JWT si l'authentification est réussie, sinon une erreur 401
    """

    user_login = UserLoginSchema(
        email_or_username=data.username, password=data.password
    )
    user = await authenticate_user(db, user_login)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    jwt_token = await create_jwt_token(db, user.id, user.username)
    response = JSONResponse(
        content={
            "message": "Login successful",
            "access_token": jwt_token.access_token,
            "token_type": jwt_token.token_type,
            "expires_in": jwt_token.expires_in,
            "username": jwt_token.username,
        }
    )
    response.set_cookie(
        key="refresh_token",
        value=jwt_token.refresh_token,
        httponly=True,
        secure=True,
        samesite="Strict",
        max_age=7 * 24 * 60 * 60,  # 7 jours
    )
    return response


@router.post(
    "/refresh",
    summary="Refresh JWT token",
    description="Generate a new JWT token using a valid refresh token",
)
@limiter.limit("10/minute")
async def refresh_token(
    request: Request,
    refresh_token: str = Cookie(
        ..., description="Refresh token stored in a secure cookie"
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint pour rafraîchir un token JWT à partir d'un token de rafraîchissement.
    Args:
        refresh_token: Token de rafraîchissement extrait d'un cookie sécurisé"""

    new_refresh_token = await refresh_jwt_token(db, refresh_token)
    response = JSONResponse(
        content={
            "message": "Token refreshed successfully",
            "access_token": new_refresh_token.access_token,
            "token_type": new_refresh_token.token_type,
            "expires_in": new_refresh_token.expires_in,
            "username": new_refresh_token.username,
        }
    )
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token.refresh_token,
        httponly=True,
        secure=True,
        samesite="Strict",
        max_age=7 * 24 * 60 * 60,  # 7 jours
    )
    return response


@router.get(
    "/skills-checked",
    response_model=UserSkillsCheckedSchema,
    summary="Get user's checked skills",
    description="Retrieve a list of skill IDs that the user has checked/acquired",
)
async def get_user_skills_checked_route(
    user_id: int = Depends(
        get_current_user
    ),  # Récupère l'ID de l'utilisateur à partir du token JWT
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint pour récupérer les compétences acquises par un utilisateur.
    Args:
        user_id: ID de l'utilisateur

    Returns:
        Liste des IDs de compétences acquises par l'utilisateur au format UserCheckSkill
    """
    return await get_user_skills_checked(db, user_id)


@router.post(
    "/skills-checked",
    status_code=204,
    summary="Add a checked skill for a user",
    description="Add a skill ID to the list of skills that the user has checked/acquired",
)
async def add_user_skill_checked_route(
    data: UserOneSkillCheckedSchema,
    user_id: int = Depends(
        get_current_user
    ),  # Récupère l'ID de l'utilisateur à partir du token JWT
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint pour ajouter une compétence acquise pour un utilisateur.
    Args:
        user_id: ID de l'utilisateur
        skill_id: ID de la compétence à ajouter

    Returns:
        Aucun contenu (204 No Content) si l'ajout est réussi
    """
    await add_user_skill_checked(db, user_id, data.skill_id)


@router.delete(
    "/skills-checked/{skill_id}",
    status_code=204,
    summary="Remove a checked skill for a user",
    description="Remove a skill ID from the list of skills that the user has checked/acquired",
)
async def remove_user_skill_checked_route(
    skill_id: int,
    user_id: int = Depends(
        get_current_user
    ),  # Récupère l'ID de l'utilisateur à partir du token JWT
    # ID de la compétence à supprimer (extrait de l'URL)
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint pour supprimer une compétence acquise pour un utilisateur.
    Args:
        user_id: ID de l'utilisateur
        skill_id: ID de la compétence à supprimer
    """
    await remove_user_skill_checked(db, user_id, skill_id)


@router.get(
    "/me/profile",
    response_model=UserSchema,
    summary="Get current user details",
    description="Retrieve details of the currently authenticated user based on the JWT token",
)
async def get_current_user_details(
    user_id: int = Depends(
        get_current_user
    ),  # Récupère l'ID de l'utilisateur à partir du token JWT
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint pour récupérer les détails de l'utilisateur actuellement authentifié.
    Args:
        user_id: ID de l'utilisateur extrait du token JWT

    Returns:
        Détails de l'utilisateur au format UserSchema si trouvé, sinon une erreur 404
    """
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get(
    "/{username}",
    response_model=UserPublicSchema,
    summary="Get user details by username",
    description="Retrieve user details based on their username",
)
async def get_user_public_by_username_route(
    username: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint pour récupérer les détails d'un utilisateur à partir de son nom d'utilisateur.
    Args:
        username: Nom d'utilisateur de l'utilisateur à récupérer

    Returns:
        Détails de l'utilisateur au format UserSchema si trouvé, sinon une erreur 404
    """
    user = await get_user_public_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch(
    "/me/profile",
    response_model=UserSchema,
    summary="Update current user details",
    description="Update the details of the currently authenticated user based on the JWT token",
)
async def update_current_user_details_route(
    data: UserUpdateSchema,
    user_id: int = Depends(
        get_current_user
    ),  # Récupère l'ID de l'utilisateur à partir du token JWT
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint pour mettre à jour les détails de l'utilisateur actuellement authentifié.
    Args:
        user_id: ID de l'utilisateur extrait du token JWT
        username: Nouveau nom d'utilisateur (optionnel)
        email: Nouvelle adresse email (optionnel)
        password: Nouveau mot de passe (optionnel)

    Returns:
        Détails de l'utilisateur mis à jour au format UserSchema si la mise à jour est réussie, sinon une erreur 404 ou 400
    """
    updated_user = await update_user(db, user_id, data)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return updated_user
