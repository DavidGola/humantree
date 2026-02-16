# /backend/app/services/auth_service.py

import os
from app.schemas.auth import JWTTokenSchema
from jose import jwt, JWTError
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException

from dotenv import load_dotenv


load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY", "")
if not SECRET_KEY or SECRET_KEY == "":
    raise ValueError("SECRET_KEY is not set in the environment variables")


def create_jwt_token(user_id: int, username: str) -> JWTTokenSchema:
    """Génère un token JWT pour l'utilisateur authentifié."""
    payload = {
        "sub": str(user_id),  # Identifiant de l'utilisateur
        "exp": datetime.utcnow() + timedelta(hours=1),  # Expiration du token
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return JWTTokenSchema(
        access_token=token, username=username, expires_in=3600, token_type="bearer"
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
