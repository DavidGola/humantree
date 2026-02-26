import json
import logging
import re

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.services.api_key_service import get_api_key, list_api_keys

logger = logging.getLogger(__name__)

ENRICH_SKILL_PROMPT = """Tu es un expert en pédagogie et apprentissage.
Génère une description enrichie pour une compétence, en HTML simple (h3, p, ul/li uniquement).
Structure obligatoire :
<h3>Description</h3>
<p>4 à 6 phrases : explique ce qu'est cette compétence, pourquoi elle est importante, et donne des exemples concrets d'application.</p>
<h3>Ressources d'apprentissage</h3>
<ul>
<li>3 à 5 ressources pertinentes (cours en ligne, livres, documentation officielle, tutoriels). Pour chaque ressource, donne le nom et une courte description.</li>
</ul>
<h3>Durée estimée</h3>
<p>Estimation optimiste mais réaliste du temps nécessaire pour acquérir cette compétence. Rappel : il s'agit d'UNE compétence parmi d'autres dans un arbre, pas de maîtriser tout un domaine. Donne une estimation courte et encourageante (en heures ou jours de pratique, pas en mois/années).</p>

Règles :
- Réponds UNIQUEMENT avec le HTML, sans texte autour
- Pas de balises html/body/head
- Utilise uniquement h3, p, ul, li comme balises
- Sois précis et concret dans les ressources (noms réels de cours/livres)
- IMPORTANT : interprète TOUJOURS la compétence dans le domaine/contexte de son arbre de compétences. Par exemple, "Patinage" dans un arbre "Snowboard" signifie glisser sur un pied en snowboard, PAS le patin à glace.
- Si une description existante est fournie, enrichis-la et améliore-la tout en gardant le sens original"""

SYSTEM_PROMPT = """Tu es un expert en pédagogie et conception de parcours d'apprentissage.
Génère un skill tree en JSON avec cette structure :
{
  "name": "...",
  "description": "...",
  "tags": ["tag1", "tag2"],
  "skills": [
    { "id": -1, "name": "...", "description": "...", "is_root": true, "unlock_ids": [-2, -3] },
    { "id": -2, "name": "...", "description": "...", "is_root": false, "unlock_ids": [-4] },
    ...
  ]
}
Règles :
- 1 seul skill avec is_root: true (point d'entrée)
- Le root n'apparaît dans aucun unlock_ids
- IDs temporaires négatifs (-1, -2, -3...)
- Progression du fondamental vers l'avancé
- Autant de skills que nécessaire pour couvrir le sujet
- Chaque description de skill doit faire 4-6 phrases : expliquer ce qu'on apprend, pourquoi c'est important, et donner un exemple concret ou une mise en pratique
- Si pertinent, ajoute des URLs de ressources utiles (documentation officielle, tutoriels, articles) dans les descriptions
- La description de l'arbre doit faire 2-3 phrases
- Max 10 tags, lowercase, alphanumériques+tirets
- LAYOUT : pense à la lisibilité visuelle de l'arbre. Organise les skills en couches claires (niveaux). Les parents d'un même skill devraient idéalement être au même niveau de profondeur. Évite qu'un skill ait trop de connexions entrantes (max 2-3 parents). Privilégie une structure en couches régulières plutôt qu'un réseau complexe.
- Réponds UNIQUEMENT avec le JSON, sans texte autour."""


def _extract_json(text: str) -> dict:
    """Extract JSON from LLM response, handling markdown code blocks."""
    # Try direct parse
    text = text.strip()
    if text.startswith("{"):
        return json.loads(text)
    # Try extracting from code block
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if match:
        return json.loads(match.group(1).strip())
    raise ValueError("Could not extract JSON from response")


def _validate_tree_structure(data: dict) -> dict:
    """Validate the generated tree structure."""
    if "name" not in data or "skills" not in data:
        raise ValueError("Missing name or skills in generated tree")

    skills = data["skills"]
    if len(skills) < 1:
        raise ValueError(f"Invalid number of skills: {len(skills)}")

    roots = [s for s in skills if s.get("is_root")]
    if len(roots) != 1:
        raise ValueError(f"Expected exactly 1 root skill, got {len(roots)}")

    return data


async def _call_anthropic(api_key: str, prompt: str, system_prompt: str = SYSTEM_PROMPT, max_tokens: int = 4096, json_mode: bool = False) -> str:
    """Call Anthropic API."""
    import anthropic
    client = anthropic.AsyncAnthropic(api_key=api_key)
    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


async def _call_google(api_key: str, prompt: str, system_prompt: str = SYSTEM_PROMPT, max_tokens: int = 4096, json_mode: bool = False) -> str:
    """Call Google Gemini API."""
    from google import genai
    client = genai.Client(api_key=api_key)
    config = {"system_instruction": system_prompt}
    if json_mode:
        config["response_mime_type"] = "application/json"
    response = await client.aio.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config=config,
    )
    return response.text


async def _call_openai(api_key: str, prompt: str, system_prompt: str = SYSTEM_PROMPT, max_tokens: int = 4096, json_mode: bool = False) -> str:
    """Call OpenAI API."""
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=api_key)
    kwargs = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": max_tokens,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    response = await client.chat.completions.create(**kwargs)
    return response.choices[0].message.content or ""


async def generate_skill_tree(
    db: AsyncSession, user_id: int, prompt: str, provider: str | None = None
) -> dict:
    """Generate a skill tree using the user's AI API key."""
    # Determine provider
    if provider is None:
        configured = await list_api_keys(db, user_id)
        if not configured:
            raise HTTPException(
                status_code=400,
                detail="Aucune clé API configurée. Ajoutez une clé dans votre profil.",
            )
        provider = configured[0].provider

    api_key = await get_api_key(db, user_id, provider)
    if api_key is None:
        raise HTTPException(
            status_code=400,
            detail=f"Aucune clé API configurée pour {provider}.",
        )

    try:
        if provider == "anthropic":
            raw_response = await _call_anthropic(api_key, prompt, json_mode=True)
        elif provider == "openai":
            raw_response = await _call_openai(api_key, prompt, json_mode=True)
        elif provider == "google":
            raw_response = await _call_google(api_key, prompt, json_mode=True)
        else:
            raise HTTPException(status_code=400, detail=f"Provider inconnu: {provider}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI API error: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"Erreur lors de l'appel à {provider}: {str(e)}",
        )

    try:
        tree_data = _extract_json(raw_response)
        tree_data = _validate_tree_structure(tree_data)
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"AI response parse error: {e}")
        raise HTTPException(
            status_code=502,
            detail="L'IA a généré une réponse invalide. Réessayez.",
        )

    return tree_data


async def _call_provider(provider: str, api_key: str, prompt: str, system_prompt: str, max_tokens: int = 2048, json_mode: bool = False) -> str:
    """Route to the correct provider call."""
    if provider == "anthropic":
        return await _call_anthropic(api_key, prompt, system_prompt, max_tokens, json_mode)
    elif provider == "openai":
        return await _call_openai(api_key, prompt, system_prompt, max_tokens, json_mode)
    elif provider == "google":
        return await _call_google(api_key, prompt, system_prompt, max_tokens, json_mode)
    else:
        raise HTTPException(status_code=400, detail=f"Provider inconnu: {provider}")


async def enrich_skill(
    db: AsyncSession,
    user_id: int,
    skill_name: str,
    tree_name: str | None = None,
    tree_description: str | None = None,
    current_description: str | None = None,
    provider: str | None = None,
) -> str:
    """Enrich a skill description using AI. Returns HTML."""
    if provider is None:
        configured = await list_api_keys(db, user_id)
        if not configured:
            raise HTTPException(
                status_code=400,
                detail="Aucune clé API configurée. Ajoutez une clé dans votre profil.",
            )
        provider = configured[0].provider

    api_key = await get_api_key(db, user_id, provider)
    if api_key is None:
        raise HTTPException(
            status_code=400,
            detail=f"Aucune clé API configurée pour {provider}.",
        )

    prompt = f"Compétence : {skill_name}"
    if tree_name:
        prompt += f"\nArbre de compétences : {tree_name}"
    if tree_description:
        prompt += f"\nDescription de l'arbre : {tree_description}"
    if current_description:
        prompt += f"\nDescription actuelle de la compétence : {current_description}"

    try:
        html = await _call_provider(provider, api_key, prompt, ENRICH_SKILL_PROMPT, max_tokens=2048)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI enrich_skill error: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"Erreur lors de l'appel à {provider}: {str(e)}",
        )

    return html.strip()
