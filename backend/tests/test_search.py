"""Tests for the search service and API endpoint."""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.search import SearchResultSchema, SearchResultsSchema
from app.services.search_service import semantic_search


def _make_tree_row(id, name, description, creator, score_field, score_value):
    """Create a mock DB row for search results."""
    row = MagicMock()
    row.id = id
    row.name = name
    row.description = description
    row.creator_username = creator
    row.created_at = datetime(2026, 1, 1)
    setattr(row, score_field, score_value)
    return row


class TestSemanticSearch:
    @pytest.mark.asyncio
    @patch("app.services.search_service.generate_embedding")
    async def test_embedding_not_implemented_falls_back_to_fts(self, mock_gen):
        """When embedding model is not configured, falls back to text-only search."""
        mock_gen.side_effect = NotImplementedError("not configured")

        db = AsyncMock()
        # FTS query returns empty
        mock_fts_result = MagicMock()
        mock_fts_result.all.return_value = []
        db.execute.return_value = mock_fts_result

        result = await semantic_search(db, "python", limit=10)

        assert isinstance(result, SearchResultsSchema)
        assert result.query == "python"
        assert result.total == 0
        assert result.results == []

    @pytest.mark.asyncio
    @patch("app.services.search_service.generate_embedding")
    async def test_semantic_failure_falls_back_to_fts(self, mock_gen):
        """When embedding API fails, falls back to text-only search."""
        mock_gen.side_effect = RuntimeError("API error")

        db = AsyncMock()
        mock_fts_result = MagicMock()
        mock_fts_result.all.return_value = []
        db.execute.return_value = mock_fts_result

        result = await semantic_search(db, "python", limit=10)

        assert isinstance(result, SearchResultsSchema)
        assert result.total == 0

    @pytest.mark.asyncio
    @patch("app.services.search_service.generate_embedding")
    async def test_fts_only_results(self, mock_gen):
        """Text search results are returned when semantic search has no results."""
        mock_gen.side_effect = NotImplementedError("not configured")

        fts_row = _make_tree_row(1, "Python Backend", "Learn Python", "user1", "text_score", 0.8)

        db = AsyncMock()
        # FTS returns results
        mock_fts_result = MagicMock()
        mock_fts_result.all.return_value = [fts_row]
        # Tags query
        mock_tag_tree = MagicMock()
        mock_tag_tree.id = 1
        mock_tag = MagicMock()
        mock_tag.name = "python"
        mock_tag_tree.tags = [mock_tag]
        mock_tags_result = MagicMock()
        mock_tags_scalars = MagicMock()
        mock_tags_scalars.all.return_value = [mock_tag_tree]
        mock_tags_result.scalars.return_value = mock_tags_scalars

        db.execute.side_effect = [mock_fts_result, mock_tags_result]

        result = await semantic_search(db, "python", limit=10)

        assert result.total == 1
        assert result.results[0].name == "Python Backend"
        assert result.results[0].tags == ["python"]
        assert result.results[0].score > 0

    @pytest.mark.asyncio
    @patch("app.services.search_service.generate_embedding")
    async def test_hybrid_merge_deduplicates(self, mock_gen):
        """Results appearing in both semantic and FTS are deduplicated with best score."""
        mock_gen.return_value = [0.1] * 384

        # Semantic returns tree id=1
        sem_row = _make_tree_row(1, "Python", "Desc", "user1", "semantic_score", 0.9)
        mock_sem_result = MagicMock()
        mock_sem_result.all.return_value = [sem_row]

        # FTS also returns tree id=1
        fts_row = _make_tree_row(1, "Python", "Desc", "user1", "text_score", 0.5)
        mock_fts_result = MagicMock()
        mock_fts_result.all.return_value = [fts_row]

        # Tags
        mock_tag_tree = MagicMock()
        mock_tag_tree.id = 1
        mock_tag_tree.tags = []
        mock_tags_result = MagicMock()
        mock_tags_scalars = MagicMock()
        mock_tags_scalars.all.return_value = [mock_tag_tree]
        mock_tags_result.scalars.return_value = mock_tags_scalars

        db = AsyncMock()
        db.execute.side_effect = [mock_sem_result, mock_fts_result, mock_tags_result]

        result = await semantic_search(db, "python", limit=10)

        # Should be 1 result, not 2
        assert result.total == 1
        # Score should combine both
        assert result.results[0].score > 0.5

    @pytest.mark.asyncio
    @patch("app.services.search_service.generate_embedding")
    async def test_empty_results(self, mock_gen):
        """No results from either search returns empty list."""
        mock_gen.return_value = [0.1] * 384

        mock_empty = MagicMock()
        mock_empty.all.return_value = []

        db = AsyncMock()
        db.execute.side_effect = [mock_empty, mock_empty]

        result = await semantic_search(db, "nonexistent", limit=10)

        assert result.total == 0
        assert result.results == []

    @pytest.mark.asyncio
    @patch("app.services.search_service.generate_embedding")
    async def test_pagination_offset(self, mock_gen):
        """Offset parameter skips results."""
        mock_gen.side_effect = NotImplementedError("not configured")

        rows = [_make_tree_row(i, f"Tree {i}", f"Desc {i}", "user1", "text_score", 1.0 - i * 0.1) for i in range(5)]

        mock_fts = MagicMock()
        mock_fts.all.return_value = rows

        # Tags for offset results
        mock_tags = MagicMock()
        mock_tags_scalars = MagicMock()
        mock_tags_scalars.all.return_value = []
        mock_tags.scalars.return_value = mock_tags_scalars

        db = AsyncMock()
        db.execute.side_effect = [mock_fts, mock_tags]

        result = await semantic_search(db, "test", limit=2, offset=2)

        assert len(result.results) == 2
        assert result.total == 5


class TestSearchResultSchema:
    def test_schema_validation(self):
        schema = SearchResultSchema(
            id=1,
            name="Test",
            description="A test tree",
            creator_username="user1",
            created_at=datetime(2026, 1, 1),
            tags=["python"],
            score=0.85,
        )
        assert schema.id == 1
        assert schema.score == 0.85

    def test_schema_null_description(self):
        schema = SearchResultSchema(
            id=1,
            name="Test",
            description=None,
            creator_username="user1",
            created_at=datetime(2026, 1, 1),
            tags=[],
            score=0.5,
        )
        assert schema.description is None
