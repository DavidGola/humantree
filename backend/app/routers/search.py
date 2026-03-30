from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.limiter import limiter
from app.schemas.search import SearchResultsSchema
from app.services.search_service import semantic_search

router = APIRouter(
    prefix="/api/v1/search",
    tags=["Search"],
)


@router.get("/", response_model=SearchResultsSchema)
@limiter.limit("30/minute")
async def search_skill_trees(
    request: Request,  # requis par slowapi
    q: str = Query(..., min_length=1, max_length=200),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Recherche sémantique + full-text de skill trees. Endpoint public."""
    return await semantic_search(db, q, limit, offset)
