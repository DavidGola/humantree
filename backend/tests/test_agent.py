"""Tests for the agent orchestrator, evaluator, improver, and fallback."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.services.agent.evaluator import _parse_quality_score, _skip_score, evaluate_tree
from app.services.agent.improver import improve_tree
from app.services.agent.orchestrator import _call_with_fallback, run_tree_agent
from app.services.agent.state import AgentConfig
from app.services.ai_service import LLMResult

# ============================================================
# Fixtures
# ============================================================

VALID_TREE = {
    "name": "Python Basics",
    "description": "Learn Python fundamentals.",
    "tags": ["python", "programming"],
    "skills": [
        {"id": -1, "name": "Variables", "description": "Learn variables.", "is_root": True, "unlock_ids": [-2]},
        {"id": -2, "name": "Functions", "description": "Learn functions.", "is_root": False, "unlock_ids": []},
    ],
}

VALID_EVALUATION_JSON = json.dumps({
    "structure": 0.9,
    "pedagogy": 0.8,
    "completeness": 0.7,
    "feedback": "Good structure, could add more skills.",
})

LOW_SCORE_EVALUATION_JSON = json.dumps({
    "structure": 0.4,
    "pedagogy": 0.3,
    "completeness": 0.5,
    "feedback": "Too few skills, descriptions too short.",
})


def _make_llm_result(text: str) -> LLMResult:
    return LLMResult(text=text, input_tokens=100, output_tokens=50, model="test-model", provider="anthropic")


# ============================================================
# Evaluator: _parse_quality_score
# ============================================================

class TestParseQualityScore:
    def test_valid_json(self):
        score = _parse_quality_score(VALID_EVALUATION_JSON)
        assert score.structure == 0.9
        assert score.pedagogy == 0.8
        assert score.completeness == 0.7
        assert score.overall == round(0.9 * 0.3 + 0.8 * 0.4 + 0.7 * 0.3, 2)
        assert "Good structure" in score.feedback

    def test_json_in_code_block(self):
        text = f"```json\n{VALID_EVALUATION_JSON}\n```"
        score = _parse_quality_score(text)
        assert score.structure == 0.9

    def test_scores_clamped_above_1(self):
        data = json.dumps({"structure": 1.5, "pedagogy": 0.8, "completeness": 0.7, "feedback": "ok"})
        score = _parse_quality_score(data)
        assert score.structure == 1.0

    def test_scores_clamped_below_0(self):
        data = json.dumps({"structure": -0.5, "pedagogy": 0.8, "completeness": 0.7, "feedback": "ok"})
        score = _parse_quality_score(data)
        assert score.structure == 0.0

    def test_invalid_json_raises(self):
        with pytest.raises((json.JSONDecodeError, ValueError)):
            _parse_quality_score("not json at all")

    def test_missing_field_raises(self):
        data = json.dumps({"structure": 0.9, "pedagogy": 0.8})
        with pytest.raises(KeyError):
            _parse_quality_score(data)


# ============================================================
# Evaluator: evaluate_tree
# ============================================================

class TestEvaluateTree:
    @pytest.mark.asyncio
    async def test_valid_response(self):
        mock_result = _make_llm_result(VALID_EVALUATION_JSON)
        with patch("app.services.agent.evaluator._call_provider", new_callable=AsyncMock, return_value=mock_result):
            score = await evaluate_tree(VALID_TREE, "anthropic", "fake-key")
        assert score.overall > 0
        assert score.structure == 0.9

    @pytest.mark.asyncio
    async def test_invalid_json_returns_skip(self):
        mock_result = _make_llm_result("this is not json")
        with patch("app.services.agent.evaluator._call_provider", new_callable=AsyncMock, return_value=mock_result):
            score = await evaluate_tree(VALID_TREE, "anthropic", "fake-key")
        assert score.overall == 1.0
        assert "failed" in score.feedback.lower()

    @pytest.mark.asyncio
    async def test_provider_error_returns_skip(self):
        with patch("app.services.agent.evaluator._call_provider", new_callable=AsyncMock, side_effect=RuntimeError("API down")):
            score = await evaluate_tree(VALID_TREE, "anthropic", "fake-key")
        assert score.overall == 1.0
        assert "failed" in score.feedback.lower()


# ============================================================
# Evaluator: _skip_score
# ============================================================

class TestSkipScore:
    def test_default(self):
        s = _skip_score()
        assert s.overall == 1.0
        assert s.feedback == "Evaluation skipped"

    def test_custom_reason(self):
        s = _skip_score("Custom reason")
        assert s.feedback == "Custom reason"


# ============================================================
# Improver: improve_tree
# ============================================================

class TestImproveTree:
    @pytest.mark.asyncio
    async def test_valid_response(self):
        improved = {**VALID_TREE, "name": "Python Basics Improved"}
        mock_result = _make_llm_result(json.dumps(improved))
        with patch("app.services.agent.improver._call_provider", new_callable=AsyncMock, return_value=mock_result):
            result = await improve_tree(VALID_TREE, "Add more skills", "Learn Python", "anthropic", "fake-key")
        assert result["name"] == "Python Basics Improved"

    @pytest.mark.asyncio
    async def test_invalid_json_raises(self):
        mock_result = _make_llm_result("not valid json")
        with patch("app.services.agent.improver._call_provider", new_callable=AsyncMock, return_value=mock_result):
            with pytest.raises(ValueError):
                await improve_tree(VALID_TREE, "feedback", "prompt", "anthropic", "fake-key")

    @pytest.mark.asyncio
    async def test_invalid_structure_raises(self):
        bad_tree = {"name": "Bad", "skills": []}  # No skills
        mock_result = _make_llm_result(json.dumps(bad_tree))
        with patch("app.services.agent.improver._call_provider", new_callable=AsyncMock, return_value=mock_result):
            with pytest.raises(ValueError):
                await improve_tree(VALID_TREE, "feedback", "prompt", "anthropic", "fake-key")

    @pytest.mark.asyncio
    async def test_provider_error_propagates(self):
        with patch("app.services.agent.improver._call_provider", new_callable=AsyncMock, side_effect=RuntimeError("API down")):
            with pytest.raises(RuntimeError):
                await improve_tree(VALID_TREE, "feedback", "prompt", "anthropic", "fake-key")


# ============================================================
# Fallback: _call_with_fallback
# ============================================================

class TestCallWithFallback:
    @pytest.mark.asyncio
    async def test_primary_succeeds(self):
        providers = {"anthropic": "key-a", "openai": "key-o"}

        async def call_fn(provider, api_key):
            return f"result-{provider}"

        result, used, fallback = await _call_with_fallback(providers, "anthropic", call_fn)
        assert result == "result-anthropic"
        assert used == "anthropic"
        assert fallback is False

    @pytest.mark.asyncio
    async def test_fallback_on_primary_failure(self):
        providers = {"anthropic": "key-a", "openai": "key-o"}
        call_count = 0

        async def call_fn(provider, api_key):
            nonlocal call_count
            call_count += 1
            if provider == "anthropic":
                raise RuntimeError("Primary down")
            return f"result-{provider}"

        result, used, fallback = await _call_with_fallback(providers, "anthropic", call_fn)
        assert result == "result-openai"
        assert used == "openai"
        assert fallback is True
        assert call_count == 2

    @pytest.mark.asyncio
    async def test_all_fail_raises_last_error(self):
        providers = {"anthropic": "key-a", "openai": "key-o"}

        async def call_fn(provider, api_key):
            raise RuntimeError(f"{provider} down")

        with pytest.raises(RuntimeError, match="openai down"):
            await _call_with_fallback(providers, "anthropic", call_fn)

    @pytest.mark.asyncio
    async def test_http_exception_not_caught(self):
        """HTTPException (4xx user errors) should not trigger fallback."""
        providers = {"anthropic": "key-a", "openai": "key-o"}

        async def call_fn(provider, api_key):
            raise HTTPException(status_code=400, detail="Bad request")

        with pytest.raises(HTTPException):
            await _call_with_fallback(providers, "anthropic", call_fn)


# ============================================================
# Orchestrator: run_tree_agent
# ============================================================

def _mock_api_key_response(provider, created_at=None):
    """Create a mock ApiKeyResponseSchema."""
    from datetime import datetime
    mock = MagicMock()
    mock.provider = provider
    mock.created_at = created_at or datetime.now()
    return mock


class TestRunTreeAgent:
    """Tests for the full agent orchestrator with all dependencies mocked."""

    @pytest.mark.asyncio
    async def test_single_pass_high_quality(self):
        """Generate → Evaluate (high score) → DONE in 1 attempt."""
        gen_result = _make_llm_result(json.dumps(VALID_TREE))
        eval_result = _make_llm_result(VALID_EVALUATION_JSON)

        mock_db = AsyncMock()
        with (
            patch("app.services.agent.orchestrator.list_api_keys", new_callable=AsyncMock,
                  return_value=[_mock_api_key_response("anthropic")]),
            patch("app.services.agent.orchestrator.get_api_key", new_callable=AsyncMock,
                  return_value="fake-key"),
            patch("app.services.agent.orchestrator._call_provider", new_callable=AsyncMock,
                  return_value=gen_result),
            patch("app.services.agent.evaluator._call_provider", new_callable=AsyncMock,
                  return_value=eval_result),
        ):
            result = await run_tree_agent(mock_db, 1, "Learn Python", "anthropic")

        assert result.tree_data["name"] == "Python Basics"
        assert result.metadata.attempts == 1
        assert result.metadata.fallback_used is False
        assert result.metadata.quality_score is not None
        assert result.metadata.quality_score.overall >= 0.7

    @pytest.mark.asyncio
    async def test_low_quality_triggers_improve(self):
        """Generate → Evaluate (low) → Improve → Evaluate (high) → DONE."""
        gen_result = _make_llm_result(json.dumps(VALID_TREE))
        low_eval = _make_llm_result(LOW_SCORE_EVALUATION_JSON)
        improved_tree = {**VALID_TREE, "name": "Python Improved"}
        improve_result = _make_llm_result(json.dumps(improved_tree))
        high_eval = _make_llm_result(VALID_EVALUATION_JSON)

        # evaluate_tree's _call_provider: first low, then high
        eval_calls = [low_eval, high_eval]
        eval_call_idx = 0

        async def mock_eval_call(*args, **kwargs):
            nonlocal eval_call_idx
            r = eval_calls[eval_call_idx]
            eval_call_idx += 1
            return r

        mock_db = AsyncMock()
        with (
            patch("app.services.agent.orchestrator.list_api_keys", new_callable=AsyncMock,
                  return_value=[_mock_api_key_response("anthropic")]),
            patch("app.services.agent.orchestrator.get_api_key", new_callable=AsyncMock,
                  return_value="fake-key"),
            patch("app.services.agent.orchestrator._call_provider", new_callable=AsyncMock,
                  return_value=gen_result),
            patch("app.services.agent.improver._call_provider", new_callable=AsyncMock,
                  return_value=improve_result),
            patch("app.services.agent.evaluator._call_provider", side_effect=mock_eval_call),
        ):
            result = await run_tree_agent(mock_db, 1, "Learn Python", "anthropic")

        assert result.metadata.attempts == 2  # generate + improve
        assert result.tree_data["name"] == "Python Improved"

    @pytest.mark.asyncio
    async def test_max_attempts_returns_best(self):
        """Both attempts score low → returns best result."""
        gen_result = _make_llm_result(json.dumps(VALID_TREE))
        low_eval = _make_llm_result(LOW_SCORE_EVALUATION_JSON)

        mock_db = AsyncMock()
        config = AgentConfig(max_attempts=1)  # Only 1 attempt

        with (
            patch("app.services.agent.orchestrator.list_api_keys", new_callable=AsyncMock,
                  return_value=[_mock_api_key_response("anthropic")]),
            patch("app.services.agent.orchestrator.get_api_key", new_callable=AsyncMock,
                  return_value="fake-key"),
            patch("app.services.agent.orchestrator._call_provider", new_callable=AsyncMock,
                  return_value=gen_result),
            patch("app.services.agent.evaluator._call_provider", new_callable=AsyncMock,
                  return_value=low_eval),
        ):
            result = await run_tree_agent(mock_db, 1, "Learn Python", "anthropic", config)

        assert result.tree_data is not None
        assert result.metadata.attempts == 1

    @pytest.mark.asyncio
    async def test_no_api_keys_raises_400(self):
        mock_db = AsyncMock()
        with patch("app.services.agent.orchestrator.list_api_keys", new_callable=AsyncMock, return_value=[]):
            with pytest.raises(HTTPException) as exc_info:
                await run_tree_agent(mock_db, 1, "Learn Python")
            assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_provider_not_configured_raises_400(self):
        mock_db = AsyncMock()
        with (
            patch("app.services.agent.orchestrator.list_api_keys", new_callable=AsyncMock,
                  return_value=[_mock_api_key_response("openai")]),
            patch("app.services.agent.orchestrator.get_api_key", new_callable=AsyncMock,
                  return_value="fake-key"),
        ):
            with pytest.raises(HTTPException) as exc_info:
                await run_tree_agent(mock_db, 1, "Learn Python", "anthropic")
            assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_fallback_on_generation_error(self):
        """Primary provider fails during generate → fallback succeeds."""
        gen_result = _make_llm_result(json.dumps(VALID_TREE))
        eval_result = _make_llm_result(VALID_EVALUATION_JSON)
        call_count = 0

        async def mock_gen(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            provider = args[0]
            if provider == "anthropic":
                raise RuntimeError("Anthropic down")
            return gen_result

        mock_db = AsyncMock()
        with (
            patch("app.services.agent.orchestrator.list_api_keys", new_callable=AsyncMock,
                  return_value=[_mock_api_key_response("anthropic"), _mock_api_key_response("openai")]),
            patch("app.services.agent.orchestrator.get_api_key", new_callable=AsyncMock,
                  return_value="fake-key"),
            patch("app.services.agent.orchestrator._call_provider", side_effect=mock_gen),
            patch("app.services.agent.evaluator._call_provider", new_callable=AsyncMock,
                  return_value=eval_result),
        ):
            result = await run_tree_agent(mock_db, 1, "Learn Python", "anthropic")

        assert result.metadata.fallback_used is True
        assert result.metadata.provider_used == "openai"

    @pytest.mark.asyncio
    async def test_metadata_fully_populated(self):
        """Verify all metadata fields are present."""
        gen_result = _make_llm_result(json.dumps(VALID_TREE))
        eval_result = _make_llm_result(VALID_EVALUATION_JSON)

        mock_db = AsyncMock()
        with (
            patch("app.services.agent.orchestrator.list_api_keys", new_callable=AsyncMock,
                  return_value=[_mock_api_key_response("anthropic")]),
            patch("app.services.agent.orchestrator.get_api_key", new_callable=AsyncMock,
                  return_value="fake-key"),
            patch("app.services.agent.orchestrator._call_provider", new_callable=AsyncMock,
                  return_value=gen_result),
            patch("app.services.agent.evaluator._call_provider", new_callable=AsyncMock,
                  return_value=eval_result),
        ):
            result = await run_tree_agent(mock_db, 1, "Learn Python", "anthropic")

        m = result.metadata
        assert isinstance(m.provider_used, str)
        assert isinstance(m.fallback_used, bool)
        assert isinstance(m.attempts, int)
        assert isinstance(m.agent_duration_seconds, float)
        assert m.quality_score is not None
        assert isinstance(m.total_input_tokens, int)
        assert isinstance(m.total_output_tokens, int)
        assert len(m.steps) >= 2  # At least generate + evaluate

    @pytest.mark.asyncio
    async def test_tokens_accumulated(self):
        """Tokens from all LLM calls are summed."""
        gen_result = LLMResult(text=json.dumps(VALID_TREE), input_tokens=200, output_tokens=300,
                               model="test", provider="anthropic")
        eval_result = LLMResult(text=VALID_EVALUATION_JSON, input_tokens=150, output_tokens=50,
                                model="test", provider="anthropic")

        mock_db = AsyncMock()
        with (
            patch("app.services.agent.orchestrator.list_api_keys", new_callable=AsyncMock,
                  return_value=[_mock_api_key_response("anthropic")]),
            patch("app.services.agent.orchestrator.get_api_key", new_callable=AsyncMock,
                  return_value="fake-key"),
            patch("app.services.agent.orchestrator._call_provider", new_callable=AsyncMock,
                  return_value=gen_result),
            patch("app.services.agent.evaluator._call_provider", new_callable=AsyncMock,
                  return_value=eval_result),
        ):
            result = await run_tree_agent(mock_db, 1, "Learn Python", "anthropic")

        # generate tokens are tracked (evaluate tokens go through evaluator's own call)
        assert result.metadata.total_input_tokens >= 200
        assert result.metadata.total_output_tokens >= 300

    @pytest.mark.asyncio
    async def test_evaluation_failure_does_not_block(self):
        """If evaluation completely fails, tree is still returned."""
        gen_result = _make_llm_result(json.dumps(VALID_TREE))

        mock_db = AsyncMock()
        with (
            patch("app.services.agent.orchestrator.list_api_keys", new_callable=AsyncMock,
                  return_value=[_mock_api_key_response("anthropic")]),
            patch("app.services.agent.orchestrator.get_api_key", new_callable=AsyncMock,
                  return_value="fake-key"),
            patch("app.services.agent.orchestrator._call_provider", new_callable=AsyncMock,
                  return_value=gen_result),
            patch("app.services.agent.evaluator._call_provider", new_callable=AsyncMock,
                  side_effect=RuntimeError("Eval broken")),
        ):
            result = await run_tree_agent(mock_db, 1, "Learn Python", "anthropic")

        # Should still return the tree (evaluation gracefully degrades)
        assert result.tree_data["name"] == "Python Basics"
        assert result.metadata.quality_score.overall == 1.0  # Skip score
