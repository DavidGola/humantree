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

# APIRouter est comme une mini-application FastAPI
# - prefix: tous les endpoints commenceront par ce préfixe
# - tags: pour organiser la documentation Swagger
router = APIRouter(
    prefix="/skill-trees",  # Les endpoints seront /skill-trees/...
    tags=["Skill Trees"],  # Catégorie dans la doc Swagger
)


# ========== ENDPOINTS ==========


@router.get(
    "/",  # Chemin relatif au prefix → URL finale : /skill-trees/
    response_model=list[SkillTreeSimpleSchema],  # Type de réponse (sérialisation auto)
    summary="Get all skill trees",  # Titre dans Swagger
    description="Retrieve a list of all skill trees available",  # Description Swagger
)
async def get_all_skill_trees(
    # Dependency Injection : FastAPI appelle automatiquement get_db()
    # et passe le résultat dans ce paramètre
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint pour récupérer tous les skill trees.

    Returns:
        Liste de tous les skill trees au format SkillTreeListSchema
    """
    result = await get_all(db)

    return result


@router.get(
    "/skill-trees-user",  # Chemin relatif au prefix → URL finale : /skill-trees-user/
    response_model=list[SkillTreeSimpleSchema],  # Type de réponse (sérialisation auto)
    summary="Get all skill trees of a user",  # Titre dans Swagger
    description="Retrieve a list of all skill trees of a user",  # Description Swagger
)
async def get_all_skill_trees_by_username(
    username: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint pour récupérer tous les skill trees d'un utilisateur.

    Returns:
        Liste de tous les skill trees d'un utilisateur au format SkillTreeListSchema
    """
    result = await get_list_of_skill_trees_by_username(db, username)

    return result


# ========== ENDPOINTS ==========
@router.get(
    "/{id}",  # Chemin relatif au prefix → URL finale : /skill-tree/{id}/
    response_model=SkillTreeDetailSchema,  # Type de réponse (sérialisation auto)
    summary="Get skill tree details",  # Titre dans Swagger
    description="Retrieve detailed information about a specific skill tree by its ID",  # Description Swagger
)
async def get_skill_tree_details(
    id: int,  # ID du skill tree à récupérer (extrait de l'URL)
    db: AsyncSession = Depends(get_db),  # Session de base de données injectée
):
    """
    Endpoint pour récupérer les détails d'un skill tree spécifique.

    Args:
        id: ID du skill tree à récupérer

    Returns:
        Détails du skill tree au format SkillTreeDetailSchema
    """
    result = await get_by_id(db, id)

    if result is None:
        # Si aucun skill tree n'est trouvé avec cet ID, on peut lever une exception HTTP 404

        raise HTTPException(status_code=404, detail="Skill tree not found")

    return result


@router.post(
    "/",
    status_code=201,  # Code HTTP pour "Created"
    response_model=SkillTreeSimpleSchema,
    summary="Create a new skill tree",
    description="Create a new skill tree with the provided name and description",
)
async def create_skill_tree_endpoint(
    data: SkillTreeCreateWithoutUsernameSchema,  # Données pour créer un nouveau skill tree
    user_id: int = Depends(
        get_current_user
    ),  # Récupère l'ID de l'utilisateur à partir du token JWT
    db: AsyncSession = Depends(get_db),  # Session de base de données injectée
):
    """
    Endpoint pour créer un nouveau skill tree.

    Args:
        data: Données pour créer un nouveau skill tree

    Returns:
        Détails du skill tree créé au format SkillTreeDetailSchema
    """
    user_username = await get_user_username(db, user_id)
    if user_username is None:
        raise HTTPException(status_code=404, detail="User not found")
    result = await create_skill_tree(
        db,
        SkillTreeCreateSchema(
            name=data.name,
            description=data.description,
            creator_username=user_username,
        ),
    )

    return result


@router.delete(
    "/{id}",
    status_code=204,  # Code HTTP pour "No Content"
    summary="Delete a skill tree",
    description="Delete a specific skill tree by its ID",
)
async def delete_skill_tree_endpoint(
    id: int,  # ID du skill tree à supprimer (extrait de l'URL)
    user_id: int = Depends(
        get_current_user
    ),  # Récupère l'ID de l'utilisateur à partir du token JWT
    db: AsyncSession = Depends(get_db),  # Session de base de données injectée
):
    """
    Endpoint pour supprimer un skill tree spécifique.

    Args:
        id: ID du skill tree à supprimer

    Returns:
        Aucun contenu (204 No Content) si la suppression est réussie
    """

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
    id: int,  # ID du skill tree à mettre à jour (extrait de l'URL)
    data: SkillTreeUpdateSchema,  # Données pour mettre à jour le skill tree
    user_id: int = Depends(
        get_current_user
    ),  # Récupère l'ID de l'utilisateur à partir du token JWT
    db: AsyncSession = Depends(get_db),  # Session de base de données injectée
):
    """
    Endpoint pour mettre à jour un skill tree spécifique.

    Args:
        id: ID du skill tree à mettre à jour
        data: Données pour mettre à jour le skill tree

    Returns:
        Détails du skill tree mis à jour au format SkillTreeSimpleSchema
    """

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
    id: int,  # ID du skill tree à sauvegarder (extrait de l'URL)
    data: SkillTreeSaveSchema,  # Données pour mettre à jour le skill tree
    user_id: int = Depends(
        get_current_user
    ),  # Récupère l'ID de l'utilisateur à partir du token JWT
    db: AsyncSession = Depends(get_db),  # Session de base de données injectée
):
    """
    Endpoint pour sauvegarder un skill tree spécifique avec ses compétences et dépendances.

    Args:
        id: ID du skill tree à sauvegarder

    Returns:
        True si la sauvegarde est réussie, False sinon
    """
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
        raise HTTPException(status_code=501, detail="Skill tree could not be saved")

    return skill_tree


async def is_user_authorized_for_editing_by_id(
    db: AsyncSession, skill_tree_id: int, user_id: int
) -> bool:
    """Vérifie si l'utilisateur est autorisé à éditer le skill tree."""
    user_username = await get_user_username(db, user_id)
    if user_username is None:
        raise HTTPException(status_code=404, detail="User not found")

    return await is_user_authorized_for_editing(db, skill_tree_id, user_username)
