# /backend/app/services/skill_tree_service.py

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.skill_tree import SkillTree
from app.models.tag import Tag, SkillTreeTag
from app.models.user_favorite_trees import UserFavoriteTrees
from app.models.user_check_skill import UserCheckSkill
from fastapi import HTTPException

logger = logging.getLogger(__name__)

from app.schemas.skill_tree import (
    SkillTreeSimpleSchema,
    SkillTreeDetailSchema,
    SkillTreeCreateSchema,
    SkillTreeUpdateSchema,
    SkillTreeSaveSchema,
)

from app.schemas.skill import SkillSchema, SkillUpdateSchema, SkillSaveSchema

from app.services.skill_service import update_skill, delete_skill
from app.models.skill import Skill

from sqlalchemy.orm import selectinload
from sqlalchemy import text, delete

from datetime import datetime


async def _sync_tags(db: AsyncSession, skill_tree_id: int, tag_names: list[str]) -> None:
    """Upsert tags et met à jour la table de jonction pour un skill tree."""
    if not tag_names:
        # Supprimer tous les tags existants
        await db.execute(
            delete(SkillTreeTag).where(SkillTreeTag.skill_tree_id == skill_tree_id)
        )
        return

    # Upsert : récupérer les tags existants
    stmt = select(Tag).where(Tag.name.in_(tag_names))
    result = await db.execute(stmt)
    existing_tags = {t.name: t for t in result.scalars().all()}

    # Créer les tags manquants
    for name in tag_names:
        if name not in existing_tags:
            tag = Tag(name=name)
            db.add(tag)
            await db.flush()
            existing_tags[name] = tag

    # Remplacer les associations
    await db.execute(
        delete(SkillTreeTag).where(SkillTreeTag.skill_tree_id == skill_tree_id)
    )
    for name in tag_names:
        db.add(SkillTreeTag(skill_tree_id=skill_tree_id, tag_id=existing_tags[name].id))


async def get_all(db: AsyncSession, tag: str | None = None) -> list[SkillTreeSimpleSchema]:
    """Récupère tous les skill_trees, avec filtrage optionnel par tag."""
    stmt = select(SkillTree).options(selectinload(SkillTree.tags))

    if tag:
        stmt = stmt.join(SkillTreeTag, SkillTree.id == SkillTreeTag.skill_tree_id).join(
            Tag, SkillTreeTag.tag_id == Tag.id
        ).where(Tag.name == tag.strip().lower())

    result = await db.execute(stmt)
    list_skill_trees = result.scalars().unique().all()
    return [SkillTreeSimpleSchema.model_validate(st) for st in list_skill_trees]


async def get_trendings(db: AsyncSession, timestamp="w") -> list[SkillTreeSimpleSchema]:
    """
    Récupère les skill_trees les plus populaires de la semaine. Les arbres tendances sont déterminés par le nombre de fois qu'ils ont été ajoutés aux favoris par les utilisateurs au cours des 7 derniers jours + par le nombre d'utilisateurs qui ont coché au moins une compétence de l'arbre au cours des 7 derniers jours.

    Args:
        db: Session de base de données async

    Returns:
        Liste de SkillTreeListSchema
    """
    timestamp_mapping = {
        "w": "7 days",
        "d": "1 day",
        "m": "30 days",
    }
    stmt = text(
        f"""SELECT skill_trees.id, skill_trees.name, skill_trees.description,    
         skill_trees.creator_username, skill_trees.created_at,  SUM(nb_users) AS score                         
  FROM (           
      SELECT skill_tree_id, COUNT(DISTINCT user_id) AS nb_users        
      FROM user_favorite_trees                                         
      WHERE created_at >= NOW() - INTERVAL '{timestamp_mapping.get(timestamp, "7 days")}'                    
      GROUP BY skill_tree_id                                  
                                                                       
      UNION ALL                                                        

      SELECT skills.skill_tree_id, COUNT(DISTINCT
  user_check_skill.user_id) AS nb_users
      FROM user_check_skill
      INNER JOIN skills ON user_check_skill.skill_id = skills.id
      WHERE user_check_skill.created_at >= NOW() - INTERVAL '{timestamp_mapping.get(timestamp, "7 days")}'
      GROUP BY skills.skill_tree_id
  ) AS combined
  INNER JOIN skill_trees ON combined.skill_tree_id = skill_trees.id
  GROUP BY skill_trees.id
  ORDER BY score DESC ;
        """
    )
    result = await db.execute(stmt)
    skill_trees = result.fetchall()

    if not skill_trees:
        return []

    # Charger les tags pour ces skill trees
    tree_ids = [st.id for st in skill_trees]
    tags_stmt = (
        select(SkillTreeTag.skill_tree_id, Tag.name)
        .join(Tag, SkillTreeTag.tag_id == Tag.id)
        .where(SkillTreeTag.skill_tree_id.in_(tree_ids))
    )
    tags_result = await db.execute(tags_stmt)
    tags_by_tree: dict[int, list[str]] = {}
    for row in tags_result:
        tags_by_tree.setdefault(row.skill_tree_id, []).append(row.name)

    return [
        SkillTreeSimpleSchema(
            id=st.id,
            name=st.name,
            description=st.description,
            creator_username=st.creator_username,
            created_at=st.created_at,
            tags=tags_by_tree.get(st.id, []),
        )
        for st in skill_trees
    ]


async def get_user_favorite_trees(
    db: AsyncSession, user_id: int
) -> list[SkillTreeSimpleSchema]:
    """Récupère la liste des IDs de skill trees favoris d'un utilisateur."""
    stmt = (
        select(SkillTree)
        .select_from(UserFavoriteTrees)
        .where(UserFavoriteTrees.user_id == user_id)
        .join(SkillTree, UserFavoriteTrees.skill_tree_id == SkillTree.id)
        .options(selectinload(SkillTree.tags))
    )
    result = await db.execute(stmt)
    skill_trees = result.scalars().all()
    return [SkillTreeSimpleSchema.model_validate(st) for st in skill_trees]


async def get_by_id(
    db: AsyncSession, skill_tree_id: int
) -> SkillTreeDetailSchema | None:
    """
    Récupère un skill_tree par son ID.

    Args:
        db: Session de base de données async
        skill_tree_id: ID du skill_tree à récupérer

    Returns:
        Un objet SkillTree ou None si non trouvé
    """
    stmt = (
        select(SkillTree)
        .where(SkillTree.id == skill_tree_id)
        .options(
            selectinload(SkillTree.skills).selectinload(Skill.unlocks),
            selectinload(SkillTree.tags),
        )
    )
    result = await db.execute(stmt)
    skill_tree = result.scalar_one_or_none()
    if skill_tree is None:
        return None
    return SkillTreeDetailSchema.model_validate(skill_tree)


async def create_skill_tree(
    db: AsyncSession, data: SkillTreeCreateSchema
) -> SkillTreeSimpleSchema:
    """Crée un nouveau skill_tree dans la base de données."""
    skill_tree_orm = SkillTree(
        name=data.name,
        description=data.description,
        creator_username=data.creator_username,
    )

    db.add(skill_tree_orm)
    try:
        await db.flush()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Error creating skill tree: possible duplicate or invalid data",
        )

    if data.tags:
        await _sync_tags(db, skill_tree_orm.id, data.tags)

    await db.commit()
    await db.refresh(skill_tree_orm, attribute_names=["tags"])

    return SkillTreeSimpleSchema.model_validate(skill_tree_orm)


async def delete_skill_tree(db: AsyncSession, skill_tree_id: int) -> bool:
    """Supprime un skill_tree de la base de données."""
    stmt = select(SkillTree).where(SkillTree.id == skill_tree_id)
    result = await db.execute(stmt)
    skill_tree = result.scalar_one_or_none()
    if skill_tree is None:
        return False

    await db.delete(skill_tree)
    await db.commit()
    return True


async def update_skill_tree(
    db: AsyncSession, skill_tree_id: int, data: SkillTreeUpdateSchema
) -> SkillTreeSimpleSchema | None:
    """Met à jour un skill_tree existant dans la base de données."""
    # SELECT
    stmt = select(SkillTree).where(SkillTree.id == skill_tree_id).options(selectinload(SkillTree.tags))
    result = await db.execute(stmt)
    skill_tree = result.scalar_one_or_none()
    if skill_tree is None:
        return None

    # UPDATE
    if data.name is not None:
        skill_tree.name = data.name
    if data.description is not None:
        skill_tree.description = data.description

    if data.tags is not None:
        await _sync_tags(db, skill_tree_id, data.tags)

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        error_msg = str(e.orig).lower() if e.orig else str(e).lower()
        if "unique" in error_msg or "duplicate" in error_msg:
            raise HTTPException(status_code=409, detail="Un arbre avec ce nom existe déjà")
        logger.error("IntegrityError inattendue dans update_skill_tree: %s", e.orig)
        raise HTTPException(status_code=400, detail="Erreur d'intégrité des données")

    await db.refresh(skill_tree, attribute_names=["tags"])
    return SkillTreeSimpleSchema.model_validate(skill_tree)


async def save_skill_tree(db: AsyncSession, skill_tree: SkillTreeSaveSchema) -> bool:
    """Sauvegarde d'un skill_tree avec ses compétences associées."""
    # Verifier qu'on a seulement un root skill
    if is_root_skill_valid(skill_tree.skills) is False:
        raise HTTPException(
            status_code=400,
            detail="error in root skill: there must be exactly one root skill and it cannot be an unlock of another skill",
        )

    # Vérifier si le skill_tree existe déjà
    stmt = select(SkillTree).where(SkillTree.id == skill_tree.id)
    result = await db.execute(stmt)
    existing_skill_tree = result.scalar_one_or_none()

    if existing_skill_tree is None:  # cas pas possible normalement
        raise HTTPException(status_code=404, detail="Skill tree not found")

    # Mettre à jour les champs du skill_tree
    existing_skill_tree.name = skill_tree.name
    existing_skill_tree.description = skill_tree.description

    # Gérer le is_root : si il reste le même quand il existe déjà, ne rien faire, sinon mettre à jour le champ is_root de la compétence concernée
    if any(s.is_root for s in skill_tree.skills):
        root_skill = next(s for s in skill_tree.skills if s.is_root)
        stmt = (
            select(Skill)
            .where(Skill.skill_tree_id == skill_tree.id, Skill.is_root == True)
            .options(selectinload(Skill.unlocks))
        )
        result = await db.execute(stmt)
        existing_root_skill = result.scalar_one_or_none()
        if existing_root_skill and existing_root_skill.id != root_skill.id:
            existing_root_skill.is_root = False
            await db.flush()

    # Gérer les compétences associées
    # Faire une liste des compétences existantes pour ce skill_tree et une autre liste pour les nouvelles id < 0
    skills_to_update = [s for s in skill_tree.skills if s.id > 0]
    new_skills = [s for s in skill_tree.skills if s.id < 0]
    ids_correspondance = {}
    skills_list = set()
    for skill in new_skills:
        skill_orm = Skill(
            name=skill.name,
            description=skill.description,
            skill_tree_id=skill_tree.id,
            is_root=skill.is_root,
        )
        db.add(skill_orm)
        await db.flush()  # pour obtenir l'id généré
        ids_correspondance[skill.id] = skill_orm.id
        skills_list.add(skill_orm.id)

    for skill in skills_to_update:
        stmt = (
            select(Skill)
            .where(Skill.id == skill.id)
            .options(selectinload(Skill.unlocks))
        )
        result = await db.execute(stmt)
        existing_skill = result.scalar_one_or_none()
        if existing_skill is None:
            raise HTTPException(
                status_code=404, detail=f"Skill with id {skill.id} not found"
            )
        existing_skill.name = skill.name
        existing_skill.description = skill.description
        existing_skill.skill_tree_id = skill_tree.id
        existing_skill.is_root = skill.is_root
        skills_list.add(existing_skill.id)

    # Mettre à jour les dépendances de compétences
    for skill in skill_tree.skills:
        skill.id = ids_correspondance.get(skill.id, skill.id)
        skill.unlock_ids = [
            ids_correspondance.get(uid, uid) for uid in skill.unlock_ids
        ]

        await update_skill(
            db, skill.id, SkillUpdateSchema(unlock_ids=skill.unlock_ids), commit=False
        )

    # Gerer la suppression des compétences qui ne sont plus présentes dans la liste
    stmt = select(Skill).where(Skill.skill_tree_id == skill_tree.id)
    result = await db.execute(stmt)
    for skill in result.scalars().all():
        if skill.id not in skills_list:
            await delete_skill(db, skill.id, commit=False)

    # Synchroniser les tags
    await _sync_tags(db, skill_tree.id, skill_tree.tags)

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        error_msg = str(e.orig).lower() if e.orig else str(e).lower()
        if "unique" in error_msg or "duplicate" in error_msg:
            raise HTTPException(
                status_code=409,
                detail="Conflit lors de la sauvegarde : doublon détecté",
            )
        logger.error("IntegrityError inattendue dans save_skill_tree: %s", e.orig)
        raise HTTPException(status_code=400, detail="Erreur d'intégrité des données")

    return True


def is_root_skill_valid(skills: list[SkillSaveSchema]) -> bool:
    """Vérifie qu'il y a exactement un root skill dans la liste."""
    if sum(s.is_root for s in skills) > 1 or (
        sum(s.is_root for s in skills) == 0 and len(skills) > 0
    ):
        return False
    id_root_skill = next((s.id for s in skills if s.is_root), None)
    list_ids_unlocks = [uid for s in skills for uid in s.unlock_ids]
    if id_root_skill in list_ids_unlocks:
        return False
    return True


async def is_user_authorized_for_editing(
    db: AsyncSession, skill_tree_id: int, username: str
) -> bool:
    """Vérifie si l'utilisateur est autorisé à éditer le skill tree."""
    stmt = select(SkillTree).where(SkillTree.id == skill_tree_id)
    result = await db.execute(stmt)
    skill_tree = result.scalar_one_or_none()
    if skill_tree is None:
        raise HTTPException(status_code=404, detail="Skill tree not found")
    return skill_tree.creator_username == username


async def get_list_of_skill_trees_by_username(
    db: AsyncSession, username: str
) -> list[SkillTreeSimpleSchema]:
    """Récupère la liste des skill trees créés par un utilisateur."""
    stmt = select(SkillTree).where(SkillTree.creator_username == username).options(selectinload(SkillTree.tags))
    result = await db.execute(stmt)
    skill_trees = result.scalars().all()
    return [SkillTreeSimpleSchema.model_validate(st) for st in skill_trees]
