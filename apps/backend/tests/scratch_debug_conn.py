import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import get_settings
from app.worker.redis_client import get_redis_client

async def test_db():
    settings = get_settings()
    print("Settings DB URL:", settings.database_url)
    print("Settings Redis URL:", settings.redis_url)
    
    # Test DB
    try:
        engine = create_async_engine(settings.database_url)
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        print("Database: OK")
    except Exception as e:
        print("Database failed:", type(e), e)
        
    # Test Redis
    try:
        redis_client = get_redis_client(settings)
        redis_client.ping()
        print("Redis: OK")
    except Exception as e:
        print("Redis failed:", type(e), e)

if __name__ == "__main__":
    asyncio.run(test_db())
