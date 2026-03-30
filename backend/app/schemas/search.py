from datetime import datetime

from pydantic import BaseModel


class SearchResultSchema(BaseModel):
    id: int
    name: str
    description: str | None
    creator_username: str
    created_at: datetime
    tags: list[str]
    score: float


class SearchResultsSchema(BaseModel):
    results: list[SearchResultSchema]
    total: int
    query: str
