import json
import logging
import re
import time
from dataclasses import dataclass

from fastapi import HTTPException
from opentelemetry import trace
from sqlalchemy.ext.asyncio import AsyncSession

from app.metrics import (
    llm_estimated_cost_dollars,
    llm_request_duration_seconds,
    llm_requests_total,
    llm_tokens_total,
)
from app.services.api_key_service import get_api_key, list_api_keys

logger = logging.getLogger(__name__)
tracer = trace.get_tracer("humantree.ai_service")


@dataclass
class LLMResult:
    text: str
    input_tokens: int
    output_tokens: int
    model: str
    provider: str


from app.constants import (  # noqa: E402
    MAX_TOKENS_ENRICH,
    MAX_TOKENS_GENERATE,
    MODEL_ANTHROPIC,
    MODEL_GOOGLE,
    MODEL_OPENAI,
    PROVIDER_ANTHROPIC,
    PROVIDER_GOOGLE,
    PROVIDER_MODELS,
    PROVIDER_OPENAI,
)

COST_PER_TOKEN = {
    MODEL_ANTHROPIC: {"input": 1.00 / 1_000_000, "output": 5.00 / 1_000_000},
    MODEL_OPENAI: {"input": 0.15 / 1_000_000, "output": 0.60 / 1_000_000},
    MODEL_GOOGLE: {"input": 0.10 / 1_000_000, "output": 0.40 / 1_000_000},
}

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
- Réponds UNIQUEMENT avec le HTML brut, sans texte autour
- NE PAS entourer la réponse de ```html ou ``` ou tout autre bloc de code markdown
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


async def _call_anthropic(
    api_key: str,
    prompt: str,
    system_prompt: str = SYSTEM_PROMPT,
    max_tokens: int = MAX_TOKENS_GENERATE,
    json_mode: bool = False,
) -> LLMResult:
    """Call Anthropic API."""
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=api_key)
    message = await client.messages.create(
        model=MODEL_ANTHROPIC,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": prompt}],
    )
    return LLMResult(
        text=message.content[0].text,
        input_tokens=message.usage.input_tokens,
        output_tokens=message.usage.output_tokens,
        model=MODEL_ANTHROPIC,
        provider=PROVIDER_ANTHROPIC,
    )


async def _call_google(
    api_key: str,
    prompt: str,
    system_prompt: str = SYSTEM_PROMPT,
    max_tokens: int = MAX_TOKENS_GENERATE,
    json_mode: bool = False,
) -> LLMResult:
    """Call Google Gemini API."""
    from google import genai

    client = genai.Client(api_key=api_key)
    config = {"system_instruction": system_prompt}
    if json_mode:
        config["response_mime_type"] = "application/json"
    response = await client.aio.models.generate_content(
        model=MODEL_GOOGLE,
        contents=prompt,
        config=config,
    )
    usage = response.usage_metadata
    return LLMResult(
        text=response.text,
        input_tokens=usage.prompt_token_count if usage else 0,
        output_tokens=usage.candidates_token_count if usage else 0,
        model=MODEL_GOOGLE,
        provider=PROVIDER_GOOGLE,
    )


async def _call_openai(
    api_key: str,
    prompt: str,
    system_prompt: str = SYSTEM_PROMPT,
    max_tokens: int = MAX_TOKENS_GENERATE,
    json_mode: bool = False,
) -> LLMResult:
    """Call OpenAI API."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=api_key)
    kwargs = {
        "model": MODEL_OPENAI,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": max_tokens,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    response = await client.chat.completions.create(**kwargs)
    usage = response.usage
    return LLMResult(
        text=response.choices[0].message.content or "",
        input_tokens=usage.prompt_tokens if usage else 0,
        output_tokens=usage.completion_tokens if usage else 0,
        model=MODEL_OPENAI,
        provider=PROVIDER_OPENAI,
    )


async def _stream_anthropic_text(
    api_key: str,
    prompt: str,
    system_prompt: str = SYSTEM_PROMPT,
    max_tokens: int = MAX_TOKENS_GENERATE,
):
    """Stream text chunks from Anthropic."""
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=api_key)
    async with client.messages.stream(
        model=MODEL_ANTHROPIC,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        async for text in stream.text_stream:
            yield text


async def _stream_openai_text(
    api_key: str,
    prompt: str,
    system_prompt: str = SYSTEM_PROMPT,
    max_tokens: int = MAX_TOKENS_GENERATE,
):
    """Stream text chunks from OpenAI."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=api_key)
    response = await client.chat.completions.create(
        model=MODEL_OPENAI,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        max_tokens=max_tokens,
        stream=True,
    )
    async for chunk in response:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


async def _stream_google_text(
    api_key: str,
    prompt: str,
    system_prompt: str = SYSTEM_PROMPT,
    max_tokens: int = MAX_TOKENS_GENERATE,
):
    """Stream text chunks from Google Gemini."""
    from google import genai

    client = genai.Client(api_key=api_key)
    stream = await client.aio.models.generate_content_stream(
        model=MODEL_GOOGLE,
        contents=prompt,
        config={"system_instruction": system_prompt},
    )
    async for chunk in stream:
        if chunk.text:
            yield chunk.text


async def _stream_provider_text(
    provider: str,
    api_key: str,
    prompt: str,
    system_prompt: str,
    max_tokens: int = MAX_TOKENS_ENRICH,
):
    """Route to the correct provider streaming function."""
    if provider == PROVIDER_ANTHROPIC:
        async for chunk in _stream_anthropic_text(api_key, prompt, system_prompt, max_tokens):
            yield chunk
    elif provider == PROVIDER_OPENAI:
        async for chunk in _stream_openai_text(api_key, prompt, system_prompt, max_tokens):
            yield chunk
    elif provider == PROVIDER_GOOGLE:
        async for chunk in _stream_google_text(api_key, prompt, system_prompt, max_tokens):
            yield chunk
    else:
        raise HTTPException(status_code=400, detail=f"Provider inconnu: {provider}")


async def generate_skill_tree(db: AsyncSession, user_id: int, prompt: str, provider: str | None = None) -> dict:
    """Generate a skill tree using the agent orchestrator with quality evaluation and provider fallback."""
    from app.services.agent.orchestrator import run_tree_agent

    result = await run_tree_agent(db, user_id, prompt, provider)

    # Build response with tree data + metadata (backward compatible)
    response = result.tree_data
    response["_metadata"] = {
        "provider_used": result.metadata.provider_used,
        "fallback_used": result.metadata.fallback_used,
        "fallback_provider": result.metadata.fallback_provider,
        "quality_score": result.metadata.quality_score.overall if result.metadata.quality_score else None,
        "quality_feedback": result.metadata.quality_score.feedback if result.metadata.quality_score else None,
        "attempts": result.metadata.attempts,
        "agent_duration_seconds": result.metadata.agent_duration_seconds,
    }
    return response


async def _call_provider(
    provider: str,
    api_key: str,
    prompt: str,
    system_prompt: str,
    max_tokens: int = 2048,
    json_mode: bool = False,
    endpoint: str = "unknown",
) -> LLMResult:
    """Route to the correct provider call with full observability."""
    model = PROVIDER_MODELS.get(provider, "unknown")

    with tracer.start_as_current_span(
        "llm_call",
        attributes={
            "llm.provider": provider,
            "llm.model": model,
            "llm.endpoint": endpoint,
            "llm.max_tokens": max_tokens,
        },
    ) as span:
        start = time.perf_counter()
        try:
            if provider == PROVIDER_ANTHROPIC:
                result = await _call_anthropic(api_key, prompt, system_prompt, max_tokens, json_mode)
            elif provider == PROVIDER_OPENAI:
                result = await _call_openai(api_key, prompt, system_prompt, max_tokens, json_mode)
            elif provider == PROVIDER_GOOGLE:
                result = await _call_google(api_key, prompt, system_prompt, max_tokens, json_mode)
            else:
                raise HTTPException(status_code=400, detail=f"Provider inconnu: {provider}")

            duration = time.perf_counter() - start

            # Prometheus metrics
            llm_requests_total.labels(provider=provider, model=model, endpoint=endpoint, status="success").inc()
            llm_tokens_total.labels(provider=provider, model=model, endpoint=endpoint, direction="input").inc(
                result.input_tokens
            )
            llm_tokens_total.labels(provider=provider, model=model, endpoint=endpoint, direction="output").inc(
                result.output_tokens
            )
            llm_request_duration_seconds.labels(provider=provider, model=model, endpoint=endpoint).observe(duration)

            rates = COST_PER_TOKEN.get(model, {"input": 0, "output": 0})
            cost = (result.input_tokens * rates["input"]) + (result.output_tokens * rates["output"])
            llm_estimated_cost_dollars.labels(provider=provider, model=model, endpoint=endpoint).inc(cost)

            # OpenTelemetry span attributes
            span.set_attribute("llm.input_tokens", result.input_tokens)
            span.set_attribute("llm.output_tokens", result.output_tokens)
            span.set_attribute("llm.duration_seconds", round(duration, 3))
            span.set_attribute("llm.estimated_cost_usd", round(cost, 6))
            span.set_attribute("llm.status", "success")

            # Structured log
            logger.info(
                "llm_call",
                extra={
                    "event": "llm_call",
                    "provider": provider,
                    "model": model,
                    "endpoint": endpoint,
                    "input_tokens": result.input_tokens,
                    "output_tokens": result.output_tokens,
                    "total_tokens": result.input_tokens + result.output_tokens,
                    "duration_seconds": round(duration, 3),
                    "estimated_cost_usd": round(cost, 6),
                    "status": "success",
                },
            )

            return result

        except HTTPException:
            raise
        except Exception as exc:
            duration = time.perf_counter() - start
            llm_requests_total.labels(provider=provider, model=model, endpoint=endpoint, status="error").inc()
            llm_request_duration_seconds.labels(provider=provider, model=model, endpoint=endpoint).observe(duration)
            span.set_attribute("llm.status", "error")
            span.set_attribute("llm.error", str(exc))
            span.record_exception(exc)

            logger.error(
                "llm_call_error",
                extra={
                    "event": "llm_call_error",
                    "provider": provider,
                    "model": model,
                    "endpoint": endpoint,
                    "duration_seconds": round(duration, 3),
                    "error": str(exc),
                    "status": "error",
                },
            )
            raise


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
        result = await _call_provider(
            provider, api_key, prompt, ENRICH_SKILL_PROMPT, max_tokens=MAX_TOKENS_ENRICH, endpoint="enrich-skill"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI enrich_skill error: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"Erreur lors de l'appel à {provider}: {str(e)}",
        )

    return result.text.strip()
