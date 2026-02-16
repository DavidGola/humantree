# /backend/app/routers/skills.py

"""Router pour les endpoints liés aux skills."""

# ========== IMPORTS ==========

# FastAPI core
from fastapi import APIRouter, Depends
from fastapi import HTTPException

# SQLAlchemy
from sqlalchemy.ext.asyncio import AsyncSession

# Database
from app.database import get_db

# Services
from app.services.skill_service import (
    create_skill,
    update_skill,
    delete_skill,
    get_skill_by_id,
    create_skill_dependencies,
    delete_all_dependencies_for_skill,
)

# Schemas
from app.schemas.skill import (
    SkillCreateSchema,
    SkillSchema,
    SkillUpdateSchema,
    SkillSimpleSchema,
)


# ========== CRÉATION DU ROUTER ==========
router = APIRouter(
    prefix="/skills",
    tags=["Skills"],  # Catégorie dans la doc Swagger
)


# ========== ENDPOINTS ==========
@router.get(
    "/{id}",  # Chemin relatif au prefix → URL finale : /skill-tree/{id}/
    response_model=SkillSchema,  # Type de réponse (sérialisation auto)
    summary="Get skills detail",  # Titre dans Swagger
    description="Retrieve detailed information about a skill",  # Description Swagger
)
async def get_skill_details(
    id: int,  # ID du skill à récupérer (extrait de l'URL)
    db: AsyncSession = Depends(get_db),  # Session de base de données injectée
):
    """
    Endpoint pour récupérer les détails d'un skill spécifique.
    Args:
        id: ID du skill tree à récupérer

    Returns:
        Détails du skill tree au format SkillTreeDetailSchema
    """
    result = await get_skill_by_id(db, id)

    if result is None:
        # Si aucun skill tree n'est trouvé avec cet ID, on peut lever une exception HTTP 404

        raise HTTPException(status_code=404, detail="Skill not found")

    return result


@router.post(
    "/",
    status_code=201,  # Code HTTP pour "Created"
    response_model=SkillSimpleSchema,
    summary="Create a new skill",
    description="Create a new skill with the provided name and description",
)
async def create_skill_endpoint(
    data: SkillCreateSchema,  # Données pour créer un nouveau skill
    db: AsyncSession = Depends(get_db),  # Session de base de données injectée
):
    """
    Endpoint pour créer un nouveau skill tree.

    Args:
        data: Données pour créer un nouveau skill tree

    Returns:
        Détails du skill tree créé au format SkillTreeDetailSchema
    """
    result = await create_skill(db, data)

    return result


@router.delete(
    "/{id}",
    status_code=204,  # Code HTTP pour "No Content"
    summary="Delete a skill",
    description="Delete a specific skill by its ID",
)
async def delete_skill_endpoint(
    id: int,  # ID du skill à supprimer (extrait de l'URL)
    db: AsyncSession = Depends(get_db),  # Session de base de données injectée
):
    """
    Endpoint pour supprimer un skill spécifique.

    Args:
        id: ID du skill à supprimer

    Returns:
        Aucun contenu (204 No Content) si la suppression est réussie
    """

    is_delete = await delete_skill(db, id)

    if not is_delete:
        raise HTTPException(status_code=404, detail="Skill not found")


@router.patch(
    "/{id}",
    response_model=SkillSchema,
    summary="Update a skill",
    description="Update the name and/or description of a specific skill by its ID",
)
async def update_skill_endpoint(
    id: int,  # ID du skill à mettre à jour (extrait de l'URL)
    data: SkillUpdateSchema,  # Données pour mettre à jour le skill
    db: AsyncSession = Depends(get_db),  # Session de base de données injectée
):
    """
    Endpoint pour mettre à jour un skill spécifique.

    Args:
        id: ID du skill à mettre à jour
        data: Données pour mettre à jour le skill
    Returns:
        Détails du skill tree mis à jour au format SkillTreeSimpleSchema
    """

    result = await update_skill(db, id, data)

    if result is None:
        raise HTTPException(status_code=404, detail="Skill not found")

    return result
