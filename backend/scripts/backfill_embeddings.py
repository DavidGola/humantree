"""Backfill embeddings for all skill trees that don't have one yet.

Usage:
    cd backend
    python -m scripts.backfill_embeddings

Idempotent: only processes trees where embedding IS NULL.
"""

import asyncio
import logging
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import func, select, text  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402

from app.constants import EMBEDDING_BATCH_SIZE  # noqa: E402
from app.models.skill_tree import SkillTree  # noqa: E402
from app.services.embedding_service import embed_skill_tree  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


async def backfill():
    database_url = os.getenv("POSTGRES_DATABASE_URL_DEV") or os.getenv("POSTGRES_DATABASE_URL")
    if not database_url:
        logger.error("No database URL configured")
        return

    engine = create_async_engine(database_url)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as db:
        # Count trees without embeddings
        count_stmt = select(func.count()).select_from(SkillTree).where(SkillTree.embedding.is_(None))
        total = (await db.execute(count_stmt)).scalar() or 0
        logger.info(f"Found {total} trees without embeddings")

        if total == 0:
            logger.info("Nothing to backfill")
            return

        # Also update tsvector for trees missing it
        tsvector_stmt = text("""
            UPDATE skill_trees SET search_vector =
                setweight(to_tsvector('french', coalesce(name, '')), 'A') ||
                setweight(to_tsvector('french', coalesce(description, '')), 'B')
            WHERE search_vector IS NULL
        """)
        result = await db.execute(tsvector_stmt)
        await db.commit()
        logger.info(f"Updated {result.rowcount} tsvector entries")

        # Process in batches
        processed = 0
        failed = 0
        offset = 0

        while offset < total:
            stmt = (
                select(SkillTree.id)
                .where(SkillTree.embedding.is_(None))
                .limit(EMBEDDING_BATCH_SIZE)
            )
            result = await db.execute(stmt)
            tree_ids = [row.id for row in result.all()]

            if not tree_ids:
                break

            for tree_id in tree_ids:
                try:
                    async with session_factory() as embed_db:
                        success = await embed_skill_tree(embed_db, tree_id)
                        if success:
                            processed += 1
                        else:
                            failed += 1
                except Exception as e:
                    logger.error(f"Failed to embed tree {tree_id}: {e}")
                    failed += 1

                if (processed + failed) % 10 == 0:
                    logger.info(f"Progress: {processed + failed}/{total} (ok={processed}, fail={failed})")

            offset += EMBEDDING_BATCH_SIZE

        logger.info(f"Backfill complete: {processed} succeeded, {failed} failed out of {total}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(backfill())
