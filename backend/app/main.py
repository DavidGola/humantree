from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.skill_trees import router as skill_trees_router
from app.routers.skills import router as skills_router
from app.routers.user import router as user_router
from dotenv import load_dotenv
import os


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


app.include_router(skill_trees_router)
# app.include_router(skills_router)
app.include_router(user_router)


@app.get("/health", tags=["Health Check"])
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
