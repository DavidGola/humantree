# /backend/app/services/skill_service.py

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.models.skill_tree import SkillTree
from app.models.skill_dependencies import SkillDependency
from fastapi import HTTPException

logger = logging.getLogger(__name__)

from app.schemas.skill import (
    SkillCreateSchema,
    SkillSchema,
    SkillUpdateSchema,
    SkillSimpleSchema,
)

from app.models.skill import Skill


async def get_skill_by_id(db: AsyncSession, skill_id: int) -> SkillSchema | None:
    """
    Récupère un skill par son ID.

    Args:
        db: Session de base de données async
        skill_id: ID du skill à récupérer

    Returns:
        Un objet Skill ou None si non trouvé
    """
    stmt = (
        select(Skill).where(Skill.id == skill_id).options(selectinload(Skill.unlocks))
    )
    result = await db.execute(stmt)
    skill = result.scalar_one_or_none()
    if skill is None:
        return None
    return SkillSchema.model_validate(skill)


async def create_skill(db: AsyncSession, data: SkillCreateSchema) -> SkillSimpleSchema:
    """Crée un nouveau skill dans la base de données."""
    new_skill = Skill(
        name=data.name,
        description=data.description,
        skill_tree_id=data.skill_tree_id,
    )
    db.add(new_skill)

    try:
        await db.flush()
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        error_msg = str(e.orig).lower() if e.orig else str(e).lower()
        if "unique" in error_msg or "duplicate" in error_msg:
            raise HTTPException(
                status_code=409,
                detail="Un skill avec ce nom existe déjà dans cet arbre",
            )
        if "foreign key" in error_msg or "is not present in table" in error_msg:
            raise HTTPException(
                status_code=400,
                detail="Skill tree introuvable",
            )
        logger.error("IntegrityError inattendue dans create_skill: %s", e.orig)
        raise HTTPException(status_code=400, detail="Erreur d'intégrité des données")

    await db.refresh(new_skill)
    return SkillSimpleSchema.model_validate(new_skill)


async def update_skill(
    db: AsyncSession, skill_id: int, data: SkillUpdateSchema, commit: bool = True
) -> SkillSchema | None:
    """Met à jour un skill existant dans la base de données."""
    stmt = (
        select(Skill).where(Skill.id == skill_id).options(selectinload(Skill.unlocks))
    )
    result = await db.execute(stmt)
    skill = result.scalar_one_or_none()
    if skill is None:
        return None

    if data.name is not None:
        skill.name = data.name
    if data.description is not None:
        skill.description = data.description
    if data.is_root is not None:
        skill.is_root = data.is_root

    await delete_all_dependencies_for_skill(db, skill_id)
    await create_skill_dependencies(db, skill_id, data.unlock_ids)

    if commit:
        await db.commit()
        await db.refresh(skill)

    return SkillSchema.model_validate(skill)


async def delete_skill(db: AsyncSession, skill_id: int, commit: bool = True) -> bool:
    """Supprime un skill de la base de données."""
    stmt = select(Skill).where(Skill.id == skill_id)
    result = await db.execute(stmt)
    skill = result.scalar_one_or_none()
    if skill is None:
        return False

    await db.delete(skill)
    if commit:
        await db.commit()
    return True


async def create_skill_dependencies(
    db: AsyncSession, id: int, unlock_ids: list[int]
) -> None:
    """Crée des dépendances de skill dans la base de données."""
    for unlock_id in unlock_ids:
        db.add(SkillDependency(skill_id=id, unlock_id=unlock_id))
    try:
        await db.flush()
    except IntegrityError as e:
        await db.rollback()
        error_msg = str(e.orig).lower() if e.orig else str(e).lower()
        if "foreign key" in error_msg or "is not present in table" in error_msg:
            raise HTTPException(
                status_code=400,
                detail=f"Skill référencé dans unlock_ids introuvable",
            )
        logger.error("IntegrityError inattendue dans create_skill_dependencies: %s", e.orig)
        raise HTTPException(status_code=400, detail="Erreur d'intégrité des données")


async def delete_all_dependencies_for_skill(db: AsyncSession, skill_id: int) -> bool:
    """Supprime toutes les dépendances d'un skill de la base de données."""
    stmt = delete(SkillDependency).where(SkillDependency.skill_id == skill_id)
    await db.execute(stmt)
    return True
