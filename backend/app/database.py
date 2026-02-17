import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from dotenv import load_dotenv


load_dotenv()
ENVIRONNMENT = os.getenv("ENVIRONMENT", "development")
if ENVIRONNMENT == "development":
    POSTGRES_DATABASE_URL = os.getenv("POSTGRES_DATABASE_URL_DEV")
else:
    POSTGRES_DATABASE_URL = os.getenv("POSTGRES_DATABASE_URL")

engine = create_async_engine(POSTGRES_DATABASE_URL, echo=True)
async_session = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session
