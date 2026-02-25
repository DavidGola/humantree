# /backend/app/routers/skill_trees.py

"""Router pour les endpoints liés aux skill trees."""

# ========== IMPORTS ==========

# FastAPI core
from fastapi import APIRouter, Depends
from fastapi import HTTPException

# SQLAlchemy
from sqlalchemy.ext.asyncio import AsyncSession

# Database
from app.database import get_db

# Services
from app.services.skill_tree_service import (
    get_all,
    get_by_id,
    create_skill_tree,
    delete_skill_tree,
    update_skill_tree,
    save_skill_tree,
    get_list_of_skill_trees_by_username,
    is_user_authorized_for_editing,
    get_trendings,
    get_user_favorite_trees,
)

from app.services.favorite_service import (
    add_user_favorite_tree,
    delete_user_favorite_tree,
)

from app.services.auth_service import get_current_user

from app.services.user_service import get_user_username

# Schemas
from app.schemas.skill_tree import (
    SkillTreeSimpleSchema,
    SkillTreeDetailSchema,
    SkillTreeCreateSchema,
    SkillTreeUpdateSchema,
    SkillTreeSaveSchema,
    SkillTreeCreateWithoutUsernameSchema,
)


# ========== CRÉATION DU ROUTER ==========

router = APIRouter(
    prefix="/api/v1/skill-trees",
    tags=["Skill Trees"],
)


# ========== ROUTES STATIQUES (sans paramètre dynamique) ==========


@router.get(
    "/",
    response_model=list[SkillTreeSimpleSchema],
    summary="Get all skill trees",
    description="Retrieve a list of all skill trees available, optionally filtered by tag",
)
async def get_all_skill_trees(
    tag: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Endpoint pour récupérer tous les skill trees, avec filtrage optionnel par tag."""
    result = await get_all(db, tag=tag)
    return result


@router.get(
    "/trendings",
    response_model=list[SkillTreeSimpleSchema],
    summary="Get trending skill trees",
    description="Retrieve a list of trending skill trees based on user favorites and checked skills in the last 7 days",
)
async def get_trending_skill_trees_endpoint(
    timestamp: str = "w",
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint pour récupérer les skill trees tendances.

    Args:
        timestamp: Période de temps pour déterminer les tendances (w: semaine, d: jour, m: mois)

    Returns:
         Liste des skill trees tendances au format SkillTreeSimpleSchema
    """
    return await get_trendings(db, timestamp)


@router.get(
    "/skill-trees-user",
    response_model=list[SkillTreeSimpleSchema],
    summary="Get all skill trees of a user",
    description="Retrieve a list of all skill trees of a user",
)
async def get_all_skill_trees_by_username(
    username: str,
    db: AsyncSession = Depends(get_db),
):
    """Endpoint pour récupérer tous les skill trees d'un utilisateur."""
    result = await get_list_of_skill_trees_by_username(db, username)
    return result


@router.get(
    "/my-skill-trees",
    response_model=list[SkillTreeSimpleSchema],
    summary="Get all skill trees of the current user",
    description="Retrieve a list of all skill trees created by the currently authenticated user",
)
async def get_all_skill_trees_of_current_user(
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Endpoint pour récupérer tous les skill trees de l'utilisateur actuellement authentifié."""
    username = await get_user_username(db, user_id)
    if username is None:
        raise HTTPException(status_code=404, detail="User not found")
    result = await get_list_of_skill_trees_by_username(db, username)
    return result


@router.get(
    "/my-favorite-skill-trees",
    response_model=list[SkillTreeSimpleSchema],
    summary="Get all favorite skill trees of the current user",
    description="Retrieve a list of all favorite skill trees of the currently authenticated user",
)
async def get_all_favorite_skill_trees_of_current_user(
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Endpoint pour récupérer tous les skill trees favoris de l'utilisateur actuellement authentifié."""

    result = await get_user_favorite_trees(db, user_id)
    return result


@router.post(
    "/favorite/{tree_id}",
    response_model=bool,
    summary="Add a skill tree to favorites",
    description="Add a specific skill tree to the favorites of the currently authenticated user",
)
async def add_skill_tree_to_favorites(
    tree_id: int,
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Endpoint pour ajouter un skill tree aux favoris de l'utilisateur actuellement authentifié."""
    result = await add_user_favorite_tree(db, user_id, tree_id)
    return result


@router.delete(
    "/favorite/{tree_id}",
    response_model=bool,
    summary="Remove a skill tree from favorites",
    description="Remove a specific skill tree from the favorites of the currently authenticated user",
)
async def remove_skill_tree_from_favorites(
    tree_id: int,
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Endpoint pour supprimer un skill tree des favoris de l'utilisateur actuellement authentifié."""
    result = await delete_user_favorite_tree(db, user_id, tree_id)
    if not result:
        raise HTTPException(status_code=404, detail="Favori introuvable")
    return result


@router.post(
    "/",
    status_code=201,
    response_model=SkillTreeSimpleSchema,
    summary="Create a new skill tree",
    description="Create a new skill tree with the provided name and description",
)
async def create_skill_tree_endpoint(
    data: SkillTreeCreateWithoutUsernameSchema,
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Endpoint pour créer un nouveau skill tree."""
    user_username = await get_user_username(db, user_id)
    if user_username is None:
        raise HTTPException(status_code=404, detail="User not found")
    result = await create_skill_tree(
        db,
        SkillTreeCreateSchema(
            name=data.name,
            description=data.description,
            creator_username=user_username,
            tags=data.tags,
        ),
    )
    return result


# ========== ROUTES DYNAMIQUES (avec /{id}) ==========


@router.get(
    "/{id}",
    response_model=SkillTreeDetailSchema,
    summary="Get skill tree details",
    description="Retrieve detailed information about a specific skill tree by its ID",
)
async def get_skill_tree_details(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Endpoint pour récupérer les détails d'un skill tree spécifique."""
    result = await get_by_id(db, id)
    if result is None:
        raise HTTPException(status_code=404, detail="Skill tree not found")
    return result


@router.delete(
    "/{id}",
    status_code=204,
    summary="Delete a skill tree",
    description="Delete a specific skill tree by its ID",
)
async def delete_skill_tree_endpoint(
    id: int,
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Endpoint pour supprimer un skill tree spécifique."""
    if not await is_user_authorized_for_editing_by_id(db, id, user_id):
        raise HTTPException(
            status_code=403, detail="Not authorized to delete this skill tree"
        )
    is_delete = await delete_skill_tree(db, id)
    if not is_delete:
        raise HTTPException(status_code=404, detail="Skill tree not found")


@router.patch(
    "/{id}",
    response_model=SkillTreeSimpleSchema,
    summary="Update a skill tree",
    description="Update the name and/or description of a specific skill tree by its ID",
)
async def update_skill_tree_endpoint(
    id: int,
    data: SkillTreeUpdateSchema,
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Endpoint pour mettre à jour un skill tree spécifique."""
    if not await is_user_authorized_for_editing_by_id(db, id, user_id):
        raise HTTPException(
            status_code=403, detail="Not authorized to update this skill tree"
        )
    result = await update_skill_tree(db, id, data)
    if result is None:
        raise HTTPException(status_code=404, detail="Skill tree not found")
    return result


@router.put(
    "/save/{id}",
    response_model=bool,
    summary="Save skill tree",
    description="Save a skill tree with its skills and dependencies",
)
async def save_skill_tree_endpoint(
    id: int,
    data: SkillTreeSaveSchema,
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Endpoint pour sauvegarder un skill tree avec ses compétences et dépendances."""
    if id != data.id:
        raise HTTPException(
            status_code=400, detail="ID in URL does not match ID in body"
        )
    if not await is_user_authorized_for_editing_by_id(db, id, user_id):
        raise HTTPException(
            status_code=403, detail="Not authorized to save this skill tree"
        )
    skill_tree = await save_skill_tree(db, data)
    if not skill_tree:
        raise HTTPException(status_code=500, detail="Skill tree could not be saved")
    return skill_tree


# ========== FONCTIONS UTILITAIRES ==========


async def is_user_authorized_for_editing_by_id(
    db: AsyncSession, skill_tree_id: int, user_id: int
) -> bool:
    """Vérifie si l'utilisateur est autorisé à éditer le skill tree."""
    user_username = await get_user_username(db, user_id)
    if user_username is None:
        raise HTTPException(status_code=404, detail="User not found")
    return await is_user_authorized_for_editing(db, skill_tree_id, user_username)
