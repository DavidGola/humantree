import os
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from dotenv import load_dotenv
from app.vault import get_secret


load_dotenv()
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

if ENVIRONMENT == "development":
    POSTGRES_DATABASE_URL = os.getenv("POSTGRES_DATABASE_URL_DEV")
elif ENVIRONMENT == "test":
    POSTGRES_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
else:
    # En production : construit l'URL depuis les secrets Vault
    db_user = get_secret("humantree/database", "POSTGRES_USER")
    db_pass = get_secret("humantree/database", "POSTGRES_PASSWORD")
    db_name = get_secret("humantree/database", "POSTGRES_DB")
    if db_user and db_pass and db_name:
        POSTGRES_DATABASE_URL = f"postgresql+asyncpg://{db_user}:{db_pass}@db:5432/{db_name}"
    else:
        POSTGRES_DATABASE_URL = os.getenv("POSTGRES_DATABASE_URL")

if not POSTGRES_DATABASE_URL:
    raise ValueError("POSTGRES_DATABASE_URL is not set in the environment variables")

engine = create_async_engine(POSTGRES_DATABASE_URL, echo=(ENVIRONMENT == "development"))
async_session = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession]:
    async with async_session() as session:
        yield session
