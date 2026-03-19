import structlog

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text

from .config import get_settings


logger = structlog.get_logger("lto-api")

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    autoflush=False
)

async def get_db():
    """Dependency to be used in FastAPI routes for the postgres code database."""
    async with AsyncSessionLocal() as session:
        yield session