from sqlalchemy import insert, select, delete
from app.models.user_favorite_trees import UserFavoriteTrees
from sqlalchemy.ext.asyncio import AsyncSession


async def add_user_favorite_tree(db: AsyncSession, user_id: int, tree_id: int) -> bool:
    """Ajoute un skill tree aux favoris d'un utilisateur."""
    stmt = insert(UserFavoriteTrees).values(user_id=user_id, skill_tree_id=tree_id)
    await db.execute(stmt)
    await db.commit()
    return True


async def delete_user_favorite_tree(
    db: AsyncSession, user_id: int, tree_id: int
) -> bool:
    """Supprime un skill tree des favoris d'un utilisateur."""
    stmt = delete(UserFavoriteTrees).where(
        UserFavoriteTrees.user_id == user_id, UserFavoriteTrees.skill_tree_id == tree_id
    )
    await db.execute(stmt)
    await db.commit()
    return True
