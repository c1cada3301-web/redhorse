from __future__ import annotations

from collections.abc import AsyncIterator
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from config import get_settings
from database.models import Base

_engine: AsyncEngine | None = None
_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def engine() -> AsyncEngine:
    """Движок создаём лениво: на импорте модуля настроек может ещё не быть."""
    global _engine

    if _engine is None:
        url = get_settings().database_url

        if url.startswith("sqlite"):
            # У файловой базы нет пула соединений, а каталог может не существовать:
            # при запуске одной командой /data — это свежий том.
            path = url.split("///")[-1]
            Path(path).parent.mkdir(parents=True, exist_ok=True)
            _engine = create_async_engine(url)
        else:
            _engine = create_async_engine(url, pool_pre_ping=True)

    return _engine


def sessionmaker() -> async_sessionmaker[AsyncSession]:
    global _sessionmaker
    if _sessionmaker is None:
        _sessionmaker = async_sessionmaker(engine(), expire_on_commit=False)
    return _sessionmaker


async def create_schema() -> None:
    """Пока таблица одна, обходимся create_all. Появится вторая — заведём Alembic."""
    async with engine().begin() as connection:
        await connection.run_sync(Base.metadata.create_all)


async def dispose() -> None:
    global _engine, _sessionmaker
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _sessionmaker = None


async def get_session() -> AsyncIterator[AsyncSession]:
    async with sessionmaker()() as session:
        yield session
