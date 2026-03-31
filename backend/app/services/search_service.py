import logging
import time

from opentelemetry import trace
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.metrics import search_duration_seconds, search_requests_total
from app.models.skill_tree import SkillTree
from app.schemas.search import SearchResultSchema, SearchResultsSchema
from app.services.embedding_service import generate_embedding

logger = logging.getLogger(__name__)
tracer = trace.get_tracer("humantree.search")


def _filter_by_score_gap(
    rows: list[dict],
    gap_ratio: float = 0.02,
    min_score: float = 0.82,
) -> list[dict]:
    """Keep only results above the first significant score gap.

    Scores from small embedding models are compressed (0.78-0.86).
    A fixed threshold can't distinguish relevant from irrelevant.
    Instead, we detect where scores drop sharply relative to the top
    result — that boundary separates the relevant cluster from noise.

    If even the top score is below min_score, nothing is relevant
    and we return an empty list (pure noise).

    Args:
        rows: sorted by semantic_score descending.
        gap_ratio: a gap > top_score * gap_ratio triggers a cut.
        min_score: absolute floor — if top result is below this, return [].
    """
    if not rows:
        return rows

    top_score = rows[0]["semantic_score"]
    if top_score < min_score:
        return []

    if len(rows) <= 1:
        return rows

    min_gap = top_score * gap_ratio

    for i in range(1, len(rows)):
        gap = rows[i - 1]["semantic_score"] - rows[i]["semantic_score"]
        if gap > min_gap:
            return rows[:i]

    return rows


async def semantic_search(
    db: AsyncSession,
    query: str,
    limit: int = 20,
    offset: int = 0,
) -> SearchResultsSchema:
    """Hybrid search: semantic (pgvector) + full-text (tsvector).

    Combines cosine similarity from embeddings with PostgreSQL full-text search
    for robust results even when embeddings are unavailable.
    """
    start = time.perf_counter()

    with tracer.start_as_current_span(
        "semantic_search",
        attributes={"search.query_length": len(query), "search.limit": limit},
    ) as span:
        results_by_id: dict[int, dict] = {}

        # 1. Semantic search via pgvector
        try:
            query_vector = await generate_embedding(query, is_query=True)
            # Only return results with cosine similarity > threshold
            min_similarity = 0.78
            semantic_stmt = (
                select(
                    SkillTree.id,
                    SkillTree.name,
                    SkillTree.description,
                    SkillTree.creator_username,
                    SkillTree.created_at,
                    (1 - SkillTree.embedding.cosine_distance(query_vector)).label("semantic_score"),
                )
                .where(SkillTree.embedding.isnot(None))
                .where(SkillTree.embedding.cosine_distance(query_vector) < (1 - min_similarity))
                .order_by(SkillTree.embedding.cosine_distance(query_vector))
                .limit(limit + offset)
            )
            result = await db.execute(semantic_stmt)
            semantic_rows = [
                {
                    "id": row.id,
                    "name": row.name,
                    "description": row.description,
                    "creator_username": row.creator_username,
                    "created_at": row.created_at,
                    "semantic_score": max(0.0, float(row.semantic_score)),
                    "text_score": 0.0,
                }
                for row in result.all()
            ]
            # Keep only the relevant cluster (cut at first significant score gap)
            semantic_rows = _filter_by_score_gap(semantic_rows)
            for r in semantic_rows:
                results_by_id[r["id"]] = r
            span.set_attribute("search.semantic_results", len(semantic_rows))
        except NotImplementedError:
            logger.info("Semantic search skipped: embedding model not configured")
            span.set_attribute("search.semantic_results", 0)
        except Exception as e:
            logger.warning(f"Semantic search failed, falling back to text-only: {e}")
            span.set_attribute("search.semantic_results", 0)

        # 2. Full-text search via tsvector (unaccent for accent-insensitive matching)
        ts_query = func.plainto_tsquery("french", func.unaccent(query))
        fts_stmt = (
            select(
                SkillTree.id,
                SkillTree.name,
                SkillTree.description,
                SkillTree.creator_username,
                SkillTree.created_at,
                func.ts_rank(SkillTree.search_vector, ts_query).label("text_score"),
            )
            .where(SkillTree.search_vector.op("@@")(ts_query))
            .order_by(text("text_score DESC"))
            .limit(limit + offset)
        )
        result = await db.execute(fts_stmt)
        for row in result.all():
            if row.id in results_by_id:
                results_by_id[row.id]["text_score"] = float(row.text_score)
            else:
                results_by_id[row.id] = {
                    "id": row.id,
                    "name": row.name,
                    "description": row.description,
                    "creator_username": row.creator_username,
                    "created_at": row.created_at,
                    "semantic_score": 0.0,
                    "text_score": float(row.text_score),
                }
        span.set_attribute("search.fts_results", len(results_by_id))

        # 3. Compute hybrid score and normalize
        max_text_score = max((r["text_score"] for r in results_by_id.values()), default=1.0) or 1.0
        for r in results_by_id.values():
            normalized_text = r["text_score"] / max_text_score
            r["score"] = round(0.7 * r["semantic_score"] + 0.3 * normalized_text, 4)

        # 4. Sort by hybrid score (gap detection already filtered semantic noise)
        sorted_results = sorted(
            results_by_id.values(),
            key=lambda r: r["score"],
            reverse=True,
        )
        paginated = sorted_results[offset : offset + limit]

        # 5. Load tags for results
        if paginated:
            tree_ids = [r["id"] for r in paginated]
            tags_stmt = select(SkillTree).where(SkillTree.id.in_(tree_ids)).options(selectinload(SkillTree.tags))
            tag_result = await db.execute(tags_stmt)
            tags_by_id: dict[int, list[str]] = {}
            for tree in tag_result.scalars().all():
                tags_by_id[tree.id] = [t.name for t in tree.tags]
        else:
            tags_by_id = {}

        # 6. Build response
        search_results = [
            SearchResultSchema(
                id=r["id"],
                name=r["name"],
                description=r["description"],
                creator_username=r["creator_username"],
                created_at=r["created_at"],
                tags=tags_by_id.get(r["id"], []),
                score=r["score"],
                semantic_score=r["semantic_score"],
                text_score=r["text_score"],
            )
            for r in paginated
        ]

        duration = time.perf_counter() - start
        search_requests_total.labels(status="success").inc()
        search_duration_seconds.observe(duration)

        span.set_attribute("search.total_results", len(sorted_results))
        span.set_attribute("search.returned_results", len(search_results))
        span.set_attribute("search.duration_seconds", round(duration, 3))

        logger.info(
            "search",
            extra={
                "event": "search",
                "query": query,
                "total_results": len(sorted_results),
                "returned_results": len(search_results),
                "duration_seconds": round(duration, 3),
            },
        )

        return SearchResultsSchema(
            results=search_results,
            total=len(sorted_results),
            query=query,
        )
