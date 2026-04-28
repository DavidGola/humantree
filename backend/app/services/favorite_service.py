import logging

from sqlalchemy import delete, insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_favorite_trees import UserFavoriteTrees
from app.services._integrity import parse_integrity_error

logger = logging.getLogger(__name__)


async def add_user_favorite_tree(db: AsyncSession, user_id: int, tree_id: int) -> bool:
    """Ajoute un skill tree aux favoris d'un utilisateur."""
    stmt = insert(UserFavoriteTrees).values(user_id=user_id, skill_tree_id=tree_id)
    try:
        await db.execute(stmt)
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise parse_integrity_error(
            e,
            duplicate_detail="Déjà en favoris",
            fk_detail="Arbre ou utilisateur introuvable",
        ) from e
    return True


async def delete_user_favorite_tree(db: AsyncSession, user_id: int, tree_id: int) -> bool:
    """Supprime un skill tree des favoris d'un utilisateur."""
    stmt = delete(UserFavoriteTrees).where(
        UserFavoriteTrees.user_id == user_id, UserFavoriteTrees.skill_tree_id == tree_id
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount != 0
