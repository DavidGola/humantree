"""Tests for the embedding service."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession  # noqa: F401

from app.services.embedding_service import (
    build_embedding_text,
    embed_skill_tree,
    generate_embedding,
)

# --- build_embedding_text ---


class TestBuildEmbeddingText:
    def test_full_content(self):
        text = build_embedding_text(
            name="Python Backend",
            description="Learn Python backend development",
            tags=["python", "backend"],
            skills=[
                {"name": "FastAPI", "description": "Build APIs"},
                {"name": "SQLAlchemy", "description": "ORM for Python"},
                {"name": "Docker", "description": None},
            ],
        )
        assert "Python Backend" in text
        assert "Learn Python backend development" in text
        assert "Tags: python, backend" in text
        assert "FastAPI: Build APIs" in text
        assert "SQLAlchemy: ORM for Python" in text
        assert "Docker" in text

    def test_minimal_content(self):
        text = build_embedding_text(
            name="Test Tree",
            description=None,
            tags=[],
            skills=[],
        )
        assert text == "Test Tree"

    def test_no_description(self):
        text = build_embedding_text(
            name="Test",
            description=None,
            tags=["tag1"],
            skills=[{"name": "Skill1", "description": "Desc1"}],
        )
        assert "Test" in text
        assert "Tags: tag1" in text
        assert "Skill1: Desc1" in text
        lines = text.split("\n")
        assert lines[0] == "Test"

    def test_empty_tags_and_skills(self):
        text = build_embedding_text(
            name="Name",
            description="Desc",
            tags=[],
            skills=[],
        )
        assert "Tags:" not in text
        assert "Skills:" not in text

    def test_special_characters(self):
        text = build_embedding_text(
            name="Développement C++",
            description="Apprendre le C++ avancé",
            tags=["c-plus-plus"],
            skills=[{"name": "Pointeurs & Références", "description": None}],
        )
        assert "Développement C++" in text
        assert "Pointeurs & Références" in text


# --- generate_embedding ---


class TestGenerateEmbedding:
    @pytest.mark.asyncio
    async def test_returns_vector(self):
        """generate_embedding returns a list of floats with correct dimensions."""
        vector = await generate_embedding("test text")
        assert isinstance(vector, list)
        assert len(vector) == 384
        assert all(isinstance(v, float) for v in vector)

    @pytest.mark.asyncio
    async def test_query_vs_passage_differ(self):
        """Query and passage prefixes produce different embeddings."""
        v_passage = await generate_embedding("Python backend", is_query=False)
        v_query = await generate_embedding("Python backend", is_query=True)
        assert v_passage != v_query


# --- embed_skill_tree ---


class TestEmbedSkillTree:
    @pytest.mark.asyncio
    async def test_tree_not_found(self):
        """Returns False when tree doesn't exist."""
        db = AsyncMock(spec=AsyncSession)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        db.execute.return_value = mock_result

        result = await embed_skill_tree(db, 999)
        assert result is False

    @pytest.mark.asyncio
    @patch("app.services.embedding_service.generate_embedding")
    async def test_successful_embedding(self, mock_gen):
        """Generates embedding and saves to tree."""
        mock_vector = [0.1] * 384
        mock_gen.return_value = mock_vector

        # Create mock tree
        mock_tag = MagicMock()
        mock_tag.name = "python"
        mock_skill = MagicMock()
        mock_skill.name = "FastAPI"
        mock_skill.description = "Build APIs with Python"
        mock_tree = MagicMock()
        mock_tree.id = 1
        mock_tree.name = "Python Backend"
        mock_tree.description = "Learn Python"
        mock_tree.tags = [mock_tag]
        mock_tree.skills = [mock_skill]

        db = AsyncMock(spec=AsyncSession)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_tree
        db.execute.return_value = mock_result

        result = await embed_skill_tree(db, 1)

        assert result is True
        assert mock_tree.embedding == mock_vector
        db.commit.assert_awaited_once()
        mock_gen.assert_awaited_once()

    @pytest.mark.asyncio
    @patch("app.services.embedding_service.generate_embedding")
    async def test_embedding_failure_returns_false(self, mock_gen):
        """Returns False when embedding generation fails."""
        mock_gen.side_effect = RuntimeError("Model error")

        mock_tree = MagicMock()
        mock_tree.id = 1
        mock_tree.name = "Test"
        mock_tree.description = None
        mock_tree.tags = []
        mock_tree.skills = []

        db = AsyncMock(spec=AsyncSession)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_tree
        db.execute.return_value = mock_result

        result = await embed_skill_tree(db, 1)

        assert result is False
        db.commit.assert_not_awaited()

    @pytest.mark.asyncio
    @patch("app.services.embedding_service.generate_embedding")
    async def test_embedding_text_content(self, mock_gen):
        """Verifies the text passed to generate_embedding contains tree data."""
        captured_text = None

        async def capture_text(text):
            nonlocal captured_text
            captured_text = text
            return [0.0] * 384

        mock_gen.side_effect = capture_text

        mock_tag = MagicMock()
        mock_tag.name = "web"
        mock_skill1 = MagicMock()
        mock_skill1.name = "HTML"
        mock_skill1.description = "Structure web pages"
        mock_skill2 = MagicMock()
        mock_skill2.name = "CSS"
        mock_skill2.description = "Style web pages"
        mock_tree = MagicMock()
        mock_tree.id = 1
        mock_tree.name = "Web Dev"
        mock_tree.description = "Frontend basics"
        mock_tree.tags = [mock_tag]
        mock_tree.skills = [mock_skill1, mock_skill2]

        db = AsyncMock(spec=AsyncSession)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_tree
        db.execute.return_value = mock_result

        await embed_skill_tree(db, 1)

        assert captured_text is not None
        assert "Web Dev" in captured_text
        assert "Frontend basics" in captured_text
        assert "web" in captured_text
        assert "HTML" in captured_text
        assert "CSS" in captured_text
