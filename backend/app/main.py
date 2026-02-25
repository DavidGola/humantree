import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.routers.skill_trees import router as skill_trees_router
from app.routers.skills import router as skills_router
from app.routers.user import router as user_router
from dotenv import load_dotenv
import os

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI()
load_dotenv()
if os.getenv("ORIGINS"):
    origins = os.getenv("ORIGINS", "").split(",")
else:
    raise ValueError("ORIGINS environment variable is not set or empty")

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
app.include_router(user_router)


@app.get("/health", tags=["Health Check"])
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
