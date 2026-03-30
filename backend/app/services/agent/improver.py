import json
import logging

from app.constants import MAX_TOKENS_GENERATE
from app.services.agent.prompts import IMPROVEMENT_SYSTEM_PROMPT
from app.services.ai_service import _call_provider, _extract_json, _validate_tree_structure

logger = logging.getLogger(__name__)


async def improve_tree(
    tree_data: dict,
    feedback: str,
    original_prompt: str,
    provider: str,
    api_key: str,
) -> dict:
    """Improve a skill tree based on evaluation feedback. Returns validated tree dict."""
    prompt = (
        f"Sujet original : {original_prompt}\n\n"
        f"Skill tree actuel :\n```json\n{json.dumps(tree_data, ensure_ascii=False, indent=2)}\n```\n\n"
        f"Feedback d'évaluation :\n{feedback}\n\n"
        f"Génère une version améliorée du skill tree en corrigeant les problèmes identifiés."
    )

    result = await _call_provider(
        provider,
        api_key,
        prompt,
        IMPROVEMENT_SYSTEM_PROMPT,
        max_tokens=MAX_TOKENS_GENERATE,
        json_mode=True,
        endpoint="improve-tree",
    )

    improved = _extract_json(result.text)
    _validate_tree_structure(improved)
    return improved
