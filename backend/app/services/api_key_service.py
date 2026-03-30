import httpx
from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import MODEL_ANTHROPIC, PROVIDER_ANTHROPIC, PROVIDER_GOOGLE, PROVIDER_OPENAI
from app.models.user_api_key import UserApiKey
from app.schemas.api_key import ApiKeyResponseSchema
from app.services.encryption_service import decrypt, encrypt

VALID_PROVIDERS = (PROVIDER_ANTHROPIC, PROVIDER_OPENAI, PROVIDER_GOOGLE)


async def validate_api_key(provider: str, key: str) -> bool:
    """Test léger de validité d'une clé API auprès du provider."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            if provider == PROVIDER_ANTHROPIC:
                resp = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": MODEL_ANTHROPIC,
                        "max_tokens": 1,
                        "messages": [{"role": "user", "content": "hi"}],
                    },
                )
                # 200 = valid, 401 = invalid key
                return resp.status_code != 401
            elif provider == PROVIDER_OPENAI:
                resp = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {key}"},
                )
                return resp.status_code != 401
            elif provider == PROVIDER_GOOGLE:
                resp = await client.get(
                    "https://generativelanguage.googleapis.com/v1beta/models",
                    params={"key": key},
                )
                return resp.status_code != 400 and resp.status_code != 403
    except httpx.HTTPError:
        return True  # Network error, assume key format is ok
    return False


async def save_api_key(db: AsyncSession, user_id: int, provider: str, plain_key: str) -> ApiKeyResponseSchema:
    """Valide, chiffre et upsert une clé API."""
    if provider not in VALID_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Provider invalide: {provider}")

    is_valid = await validate_api_key(provider, plain_key)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Clé API invalide")

    encrypted = encrypt(plain_key)

    # Upsert
    stmt = select(UserApiKey).where(UserApiKey.user_id == user_id, UserApiKey.provider == provider)
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        existing.encrypted_key = encrypted
    else:
        existing = UserApiKey(user_id=user_id, provider=provider, encrypted_key=encrypted)
        db.add(existing)

    await db.commit()
    await db.refresh(existing)
    return ApiKeyResponseSchema(provider=existing.provider, created_at=existing.created_at)


async def get_api_key(db: AsyncSession, user_id: int, provider: str) -> str | None:
    """Décrypte et retourne une clé API."""
    stmt = select(UserApiKey).where(UserApiKey.user_id == user_id, UserApiKey.provider == provider)
    result = await db.execute(stmt)
    key_row = result.scalar_one_or_none()
    if key_row is None:
        return None
    return decrypt(key_row.encrypted_key)


async def delete_api_key(db: AsyncSession, user_id: int, provider: str) -> bool:
    """Supprime une clé API."""
    stmt = delete(UserApiKey).where(UserApiKey.user_id == user_id, UserApiKey.provider == provider)
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount > 0


async def list_api_keys(db: AsyncSession, user_id: int) -> list[ApiKeyResponseSchema]:
    """Liste les providers configurés (sans exposer les clés)."""
    stmt = select(UserApiKey).where(UserApiKey.user_id == user_id)
    result = await db.execute(stmt)
    keys = result.scalars().all()
    return [ApiKeyResponseSchema(provider=k.provider, created_at=k.created_at) for k in keys]
