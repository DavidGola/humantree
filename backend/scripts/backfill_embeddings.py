"""Backfill embeddings for skill trees.

Usage:
    cd backend
    python -m scripts.backfill_embeddings          # only trees without embedding
    python -m scripts.backfill_embeddings --force   # re-embed ALL trees
"""

import argparse
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


async def backfill(*, force: bool = False):
    database_url = os.getenv("POSTGRES_DATABASE_URL_DEV") or os.getenv("POSTGRES_DATABASE_URL")
    if not database_url:
        logger.error("No database URL configured")
        return

    engine = create_async_engine(database_url)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as db:
        # Count trees to process
        base_stmt = select(func.count()).select_from(SkillTree)
        if not force:
            base_stmt = base_stmt.where(SkillTree.embedding.is_(None))
        total = (await db.execute(base_stmt)).scalar() or 0
        mode = "ALL (force)" if force else "missing only"
        logger.info(f"Found {total} trees to embed ({mode})")

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
            stmt = select(SkillTree.id)
            if not force:
                stmt = stmt.where(SkillTree.embedding.is_(None))
            stmt = stmt.limit(EMBEDDING_BATCH_SIZE).offset(offset)
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
    parser = argparse.ArgumentParser(description="Backfill skill tree embeddings")
    parser.add_argument("--force", action="store_true", help="Re-embed ALL trees (not just missing)")
    args = parser.parse_args()
    asyncio.run(backfill(force=args.force))
