from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.ai import AIEnrichSkillSchema, AIGenerateTreeSchema
from app.services.agent.orchestrator import run_tree_agent_stream
from app.services.ai_service import (
    ENRICH_SKILL_PROMPT,
    MAX_TOKENS_ENRICH,
    _stream_provider_text,
)
from app.services.api_key_service import get_api_key, list_api_keys
from app.services.auth_service import get_current_user

router = APIRouter(
    prefix="/api/v1/ai",
    tags=["AI"],
)


@router.post(
    "/generate-tree",
    summary="Generate a skill tree using AI (SSE stream)",
)
async def generate_tree_route(
    data: AIGenerateTreeSchema,
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    configured = await list_api_keys(db, user_id)
    if not configured:
        raise HTTPException(
            status_code=400,
            detail="Aucune clé API configurée. Ajoutez une clé dans votre profil.",
        )

    provider = data.provider or configured[0].provider
    providers: dict[str, str] = {}
    for cfg in configured:
        key = await get_api_key(db, user_id, cfg.provider)
        if key:
            providers[cfg.provider] = key

    if provider not in providers:
        raise HTTPException(
            status_code=400,
            detail=f"Aucune clé API configurée pour {provider}.",
        )

    return StreamingResponse(
        run_tree_agent_stream(providers, provider, data.prompt),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post(
    "/enrich-skill",
    summary="Enrich a skill description using AI (streaming)",
)
async def enrich_skill_route(
    data: AIEnrichSkillSchema,
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    provider = data.provider
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

    prompt = f"Compétence : {data.skill_name}"
    if data.tree_name:
        prompt += f"\nArbre de compétences : {data.tree_name}"
    if data.tree_description:
        prompt += f"\nDescription de l'arbre : {data.tree_description}"
    if data.current_description:
        prompt += f"\nDescription actuelle de la compétence : {data.current_description}"

    return StreamingResponse(
        _stream_provider_text(provider, api_key, prompt, ENRICH_SKILL_PROMPT, MAX_TOKENS_ENRICH),
        media_type="text/plain",
    )
