import os

# Doit être AVANT l'import de app.main pour désactiver le tracing
os.environ["ENVIRONMENT"] = "test"

import pytest_asyncio
import sqlalchemy as sa
from dotenv import load_dotenv
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.database import get_db
from app.limiter import limiter
from app.main import app
from app.models.base_model import BaseModel

load_dotenv()
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
if not TEST_DATABASE_URL:
    raise ValueError("TEST_DATABASE_URL is not set")

engine_test = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
TestSessionLocal = async_sessionmaker(engine_test)


@pytest_asyncio.fixture
async def setup_db():
    async with engine_test.begin() as conn:
        await conn.execute(sa.text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(BaseModel.metadata.create_all)
    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(BaseModel.metadata.drop_all)


@pytest_asyncio.fixture
async def client(setup_db):
    async def get_db_test():
        async with TestSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = get_db_test
    limiter.enabled = False

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
    limiter.enabled = True


async def register_user(
    client: AsyncClient,
    username: str = "testuser",
    email: str = "test@example.com",
    password: str = "password123",
) -> dict:
    """Helper : crée un utilisateur et retourne la réponse JSON."""
    response = await client.post(
        "/api/v1/users/register",
        json={"username": username, "email": email, "password": password},
    )
    assert response.status_code == 200
    return response.json()


async def login_user(
    client: AsyncClient,
    username: str = "testuser",
    password: str = "password123",
) -> dict:
    """Helper : login et retourne la réponse JSON (avec access_token)."""
    response = await client.post(
        "/api/v1/users/login",
        data={"username": username, "password": password},
    )
    assert response.status_code == 200
    return response.json()


async def auth_cookies(
    client: AsyncClient,
    username: str = "testuser",
    password: str = "password123",
) -> dict:
    """Helper : login et retourne les cookies d'authentification."""
    response = await client.post(
        "/api/v1/users/login",
        data={"username": username, "password": password},
    )
    assert response.status_code == 200
    return dict(response.cookies)


async def create_skill_tree(
    client: AsyncClient,
    cookies: dict,
    name: str = "Test Tree",
    description: str | None = "A test skill tree",
) -> dict:
    """Helper : crée un skill tree et retourne la réponse JSON."""
    response = await client.post(
        "/api/v1/skill-trees/",
        json={"name": name, "description": description},
        cookies=cookies,
    )
    assert response.status_code == 201
    return response.json()
