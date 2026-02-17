from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.skill_trees import router as skill_trees_router
from app.routers.skills import router as skills_router
from app.routers.user import router as user_router
from .database import ENVIRONNMENT


app = FastAPI()


if ENVIRONNMENT == "development":
    origins = ["http://localhost:5173"]
else:
    origins = ["http://localhost"]  # Adjust this for production

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(skill_trees_router)
app.include_router(skills_router)
app.include_router(user_router)


@app.get("/health", tags=["Health Check"])
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
