from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth_service import get_current_user
from app.services.api_key_service import save_api_key, list_api_keys, delete_api_key
from app.schemas.api_key import ApiKeyCreateSchema, ApiKeyResponseSchema

router = APIRouter(
    prefix="/api/v1/users/api-keys",
    tags=["API Keys"],
)


@router.post(
    "",
    response_model=ApiKeyResponseSchema,
    summary="Save an API key",
)
async def save_api_key_route(
    data: ApiKeyCreateSchema,
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await save_api_key(db, user_id, data.provider, data.api_key)


@router.get(
    "",
    response_model=list[ApiKeyResponseSchema],
    summary="List configured API key providers",
)
async def list_api_keys_route(
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await list_api_keys(db, user_id)


@router.delete(
    "/{provider}",
    status_code=204,
    summary="Delete an API key",
)
async def delete_api_key_route(
    provider: str,
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deleted = await delete_api_key(db, user_id, provider)
    if not deleted:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="API key not found")
