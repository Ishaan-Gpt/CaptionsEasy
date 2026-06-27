"""Sync SQLAlchemy session for Celery tasks.

Celery's task model is synchronous; the API layer's `app.db.session` is an
async engine for FastAPI's event loop. Rather than forcing asyncio into
Celery's worker pool, the worker gets its own sync engine here. Same
database, same models — just a different driver/session for a different
runtime.
"""

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings

_engine = None
_SessionLocal: sessionmaker | None = None


def _sync_url(async_database_url: str) -> str:
    return async_database_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")


def _get_session_factory(settings: Settings) -> sessionmaker:
    global _engine, _SessionLocal
    if _SessionLocal is None:
        _engine = create_engine(_sync_url(settings.database_url), pool_pre_ping=True)
        _SessionLocal = sessionmaker(bind=_engine, expire_on_commit=False)
    return _SessionLocal


@contextmanager
def worker_session(settings: Settings) -> Iterator[Session]:
    session_factory = _get_session_factory(settings)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
