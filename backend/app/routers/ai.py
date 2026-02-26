from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth_service import get_current_user
from app.services.ai_service import generate_skill_tree, enrich_skill
from app.schemas.ai import AIGenerateTreeSchema, AIEnrichSkillSchema

router = APIRouter(
    prefix="/api/v1/ai",
    tags=["AI"],
)


@router.post(
    "/generate-tree",
    summary="Generate a skill tree using AI",
)
async def generate_tree_route(
    data: AIGenerateTreeSchema,
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await generate_skill_tree(db, user_id, data.prompt, data.provider)
    return result


@router.post(
    "/enrich-skill",
    summary="Enrich a skill description using AI",
)
async def enrich_skill_route(
    data: AIEnrichSkillSchema,
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    description = await enrich_skill(
        db, user_id, data.skill_name,
        tree_name=data.tree_name,
        tree_description=data.tree_description,
        current_description=data.current_description,
        provider=data.provider,
    )
    return {"description": description}
