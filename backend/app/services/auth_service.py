# /backend/app/services/auth_service.py

import os
from app.schemas.auth import JWTTokenSchema
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException
from secrets import token_urlsafe
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert, select
from app.models.tokens import Token
from app.services.user_service import get_user_username

from dotenv import load_dotenv


load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY", "")
if not SECRET_KEY or SECRET_KEY == "":
    raise ValueError("SECRET_KEY is not set in the environment variables")


async def create_jwt_token(
    db: AsyncSession, user_id: int, username: str
) -> JWTTokenSchema:
    """Génère un token JWT pour l'utilisateur authentifié."""
    refresh_token = token_urlsafe(32)  # Génère un token de rafraîchissement sécurisé
    # Ici, vous pouvez stocker le refresh_token dans la base de données associé à l'utilisateur pour une gestion future (ex: invalidation, rotation, etc.)
    stmt = insert(Token).values(
        user_id=user_id,
        token=refresh_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    await db.execute(stmt)
    await db.commit()
    payload = {
        "sub": str(user_id),  # Identifiant de l'utilisateur
        "exp": datetime.now(timezone.utc)
        + timedelta(minutes=15),  # Expiration du token
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return JWTTokenSchema(
        access_token=token,
        username=username,
        expires_in=900,
        token_type="bearer",
        refresh_token=refresh_token,
    )


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")


async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Récupère l'utilisateur actuel à partir du token JWT."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Retourner le user_id (ou aller chercher le user en base)
    return int(user_id)


async def refresh_jwt_token(db: AsyncSession, refresh_token: str) -> JWTTokenSchema:
    """Génère un nouveau token JWT à partir d'un token de rafraîchissement."""
    # Vérifiez que le refresh_token existe et est valide
    stmt = select(Token).where(Token.token == refresh_token)
    result = await db.execute(stmt)
    token_entry = result.scalar_one_or_none()
    if not token_entry or token_entry.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    # Supprimez le token de rafraîchissement utilisé pour éviter les réutilisations
    await db.delete(token_entry)
    await db.commit()
    # Générer un nouveau token JWT
    username = await get_user_username(db, token_entry.user_id)
    if username is None:
        raise HTTPException(status_code=404, detail="User not found")
    return await create_jwt_token(db, token_entry.user_id, username)
