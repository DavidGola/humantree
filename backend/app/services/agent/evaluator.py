import json
import logging

from app.constants import MAX_TOKENS_EVALUATE
from app.services.agent.prompts import EVALUATION_SYSTEM_PROMPT
from app.services.agent.state import QualityScore
from app.services.ai_service import _call_provider

logger = logging.getLogger(__name__)


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def _parse_quality_score(text: str) -> QualityScore:
    """Parse LLM evaluation response into a QualityScore."""
    text = text.strip()
    if not text.startswith("{"):
        import re

        match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
        if match:
            text = match.group(1).strip()

    data = json.loads(text)
    structure = _clamp(float(data["structure"]))
    pedagogy = _clamp(float(data["pedagogy"]))
    completeness = _clamp(float(data["completeness"]))
    overall = round((structure * 0.3 + pedagogy * 0.4 + completeness * 0.3), 2)

    return QualityScore(
        overall=overall,
        structure=structure,
        pedagogy=pedagogy,
        completeness=completeness,
        feedback=str(data.get("feedback", "")),
    )


def _skip_score(reason: str = "Evaluation skipped") -> QualityScore:
    return QualityScore(overall=1.0, structure=1.0, pedagogy=1.0, completeness=1.0, feedback=reason)


async def evaluate_tree(tree_data: dict, provider: str, api_key: str) -> QualityScore:
    """Evaluate a generated skill tree. Gracefully degrades on failure."""
    prompt = f"Évalue ce skill tree :\n```json\n{json.dumps(tree_data, ensure_ascii=False, indent=2)}\n```"

    try:
        result = await _call_provider(
            provider,
            api_key,
            prompt,
            EVALUATION_SYSTEM_PROMPT,
            max_tokens=MAX_TOKENS_EVALUATE,
            json_mode=True,
            endpoint="evaluate-tree",
        )
        return _parse_quality_score(result.text)
    except Exception as e:
        logger.warning(f"Tree evaluation failed, skipping: {e}")
        return _skip_score(f"Evaluation failed: {type(e).__name__}")
