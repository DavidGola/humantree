import logging
import time

from opentelemetry import trace
from sentence_transformers import SentenceTransformer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.constants import EMBEDDING_MODEL
from app.metrics import embedding_duration_seconds, embedding_requests_total
from app.models.skill_tree import SkillTree
from app.services.skill_tree_service import _build_search_vector, _concat_skills_text

logger = logging.getLogger(__name__)
tracer = trace.get_tracer("humantree.embedding")

# Singleton — chargé une seule fois au démarrage du process
_model = SentenceTransformer(EMBEDDING_MODEL)


def build_embedding_text(
    name: str,
    description: str | None,
    tags: list[str],
    skills: list[dict[str, str | None]],
) -> str:
    """Build the text to embed for a skill tree.

    Args:
        skills: list of {"name": ..., "description": ...} dicts.
    """
    parts = [name]
    if description:
        parts.append(description)
    if tags:
        parts.append(f"\nTags: {', '.join(tags)}")
    if skills:
        skill_parts = []
        for s in skills:
            if s.get("description"):
                skill_parts.append(f"{s['name']}: {s['description']}")
            else:
                skill_parts.append(s["name"])
        parts.append(f"\nSkills: {'; '.join(skill_parts)}")
    return "\n".join(parts)


async def generate_embedding(text: str, *, is_query: bool = False) -> list[float]:
    """Generate an embedding vector from text using multilingual-e5-small.

    E5 models require a prefix:
    - "query: " for search queries
    - "passage: " for documents to index

    Args:
        text: The text to embed.
        is_query: True for search queries, False for document indexation.

    Returns a list of floats with EMBEDDING_DIMENSIONS dimensions.
    """
    prefix = "query: " if is_query else "passage: "
    vector = _model.encode(prefix + text, normalize_embeddings=True)
    return vector.tolist()


async def embed_skill_tree(db: AsyncSession, tree_id: int) -> bool:
    """Load a tree from DB, generate embedding, and save it back.

    Returns True if embedding was generated, False if tree not found.
    """
    with tracer.start_as_current_span(
        "embed_skill_tree",
        attributes={"tree.id": tree_id},
    ):
        # Load tree with skills and tags
        stmt = (
            select(SkillTree)
            .where(SkillTree.id == tree_id)
            .options(
                selectinload(SkillTree.skills),
                selectinload(SkillTree.tags),
            )
        )
        result = await db.execute(stmt)
        tree = result.scalar_one_or_none()
        if tree is None:
            logger.warning(f"Tree {tree_id} not found for embedding")
            return False

        # Build text
        tag_names = [t.name for t in tree.tags]
        skills = [{"name": s.name, "description": s.description} for s in tree.skills]
        text = build_embedding_text(tree.name, tree.description, tag_names, skills)

        # Generate embedding
        start = time.perf_counter()
        try:
            vector = await generate_embedding(text)
            duration = time.perf_counter() - start

            embedding_requests_total.labels(status="success").inc()
            embedding_duration_seconds.observe(duration)

            logger.info(
                "embedding_generated",
                extra={
                    "event": "embedding_generated",
                    "tree_id": tree_id,
                    "text_length": len(text),
                    "dimensions": len(vector),
                    "duration_seconds": round(duration, 3),
                },
            )
        except Exception as e:
            duration = time.perf_counter() - start
            embedding_requests_total.labels(status="error").inc()
            embedding_duration_seconds.observe(duration)
            logger.warning(f"Embedding generation failed for tree {tree_id}: {e}")
            return False

        # Update tree embedding + search vector
        tree.embedding = vector
        skills_text = _concat_skills_text(tree.skills)
        tree.search_vector = _build_search_vector(tree, skills_text)
        await db.commit()
        return True
