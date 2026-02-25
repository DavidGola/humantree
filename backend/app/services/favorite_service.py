import logging

from sqlalchemy import insert, delete
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from app.models.user_favorite_trees import UserFavoriteTrees
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def add_user_favorite_tree(db: AsyncSession, user_id: int, tree_id: int) -> bool:
    """Ajoute un skill tree aux favoris d'un utilisateur."""
    stmt = insert(UserFavoriteTrees).values(user_id=user_id, skill_tree_id=tree_id)
    try:
        await db.execute(stmt)
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        error_msg = str(e.orig).lower() if e.orig else str(e).lower()
        if "unique" in error_msg or "duplicate" in error_msg:
            raise HTTPException(status_code=409, detail="Déjà en favoris")
        if "foreign key" in error_msg or "is not present in table" in error_msg:
            raise HTTPException(status_code=400, detail="Arbre ou utilisateur introuvable")
        logger.error("IntegrityError inattendue dans add_user_favorite_tree: %s", e.orig)
        raise HTTPException(status_code=400, detail="Erreur d'intégrité des données")
    return True


async def delete_user_favorite_tree(
    db: AsyncSession, user_id: int, tree_id: int
) -> bool:
    """Supprime un skill tree des favoris d'un utilisateur."""
    stmt = delete(UserFavoriteTrees).where(
        UserFavoriteTrees.user_id == user_id, UserFavoriteTrees.skill_tree_id == tree_id
    )
    result = await db.execute(stmt)
    await db.commit()
    if result.rowcount == 0:
        return False
    return True
