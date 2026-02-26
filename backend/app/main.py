import logging

import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from app.limiter import limiter
from app.routers.skill_trees import router as skill_trees_router
from app.routers.skills import router as skills_router
from app.routers.user import router as user_router
from app.routers.api_keys import router as api_keys_router
from app.routers.ai import router as ai_router
from dotenv import load_dotenv
import os

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

load_dotenv()
if os.getenv("ORIGINS"):
    origins = os.getenv("ORIGINS", "").split(",")
else:
    raise ValueError("ORIGINS environment variable is not set or empty")


# --- Middleware : headers de sécurité + limite taille payload ---
MAX_CONTENT_LENGTH = 1_000_000  # 1 Mo


class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Validation taille du payload
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_CONTENT_LENGTH:
            return JSONResponse(
                status_code=413,
                content={"detail": "Le contenu dépasse la taille maximale autorisée (1 Mo)."},
            )

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000)

        # Logging requête
        status = response.status_code
        log_msg = f"{request.method} {request.url.path} {status} {duration_ms}ms"
        if status >= 500:
            logger.error(log_msg)
        elif status >= 400:
            logger.warning(log_msg)
        else:
            logger.info(log_msg)

        # Headers de sécurité
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"

        return response


app.add_middleware(SecurityMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    """Handler global pour les IntegrityError non catchées dans les services."""
    logger.error("IntegrityError non gérée: %s", exc.orig)
    error_msg = str(exc.orig).lower() if exc.orig else str(exc).lower()

    if "unique" in error_msg or "duplicate" in error_msg:
        return JSONResponse(
            status_code=409,
            content={"detail": "Conflit : une ressource avec ces données existe déjà"},
        )
    if "foreign key" in error_msg or "fk_" in error_msg or "is not present in table" in error_msg:
        return JSONResponse(
            status_code=400,
            content={"detail": "Référence invalide : la ressource liée n'existe pas"},
        )
    if "check" in error_msg:
        return JSONResponse(
            status_code=400,
            content={"detail": "Contrainte de validation violée"},
        )

    return JSONResponse(
        status_code=400,
        content={"detail": "Erreur d'intégrité des données"},
    )


app.include_router(skill_trees_router)
# app.include_router(skills_router)
app.include_router(api_keys_router)
app.include_router(user_router)
app.include_router(ai_router)


@app.get("/health", tags=["Health Check"])
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
