import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from dotenv import load_dotenv


load_dotenv()
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
if ENVIRONMENT == "development":
    POSTGRES_DATABASE_URL = os.getenv("POSTGRES_DATABASE_URL_DEV")
else:
    POSTGRES_DATABASE_URL = os.getenv("POSTGRES_DATABASE_URL")

if not POSTGRES_DATABASE_URL:
    raise ValueError("POSTGRES_DATABASE_URL is not set in the environment variables")

engine = create_async_engine(POSTGRES_DATABASE_URL, echo=(ENVIRONMENT == "development"))
async_session = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session
