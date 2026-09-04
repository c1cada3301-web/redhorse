from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from auth import current_user, ensure_admin, ensure_secret
from config import get_settings
from database.session import create_schema, dispose
from routers import auth as auth_router
from routers import cleanup, containers, images, system

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # Схема и первый администратор создаются до приёма запросов.
    await create_schema()
    # Секрет — до приёма запросов: без него нечем проверять сессии.
    await ensure_secret()
    await ensure_admin()
    yield
    await dispose()


app = FastAPI(
    title="Dala",
    description="Управление Docker: контейнеры, логи, образы.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Вход и первичная настройка — единственное, что доступно без авторизации.
app.include_router(auth_router.router)

# Всё остальное закрыто: доступ к Docker-сокету равносилен root на хосте.
protected = [Depends(current_user)]
app.include_router(containers.router, dependencies=protected)
app.include_router(images.router, dependencies=protected)
app.include_router(system.router, dependencies=protected)
app.include_router(cleanup.router, dependencies=protected)


@app.get("/api/health", tags=["system"])
async def health() -> dict:
    return {"status": "ok", "env": settings.env}


# --- статика панели ---------------------------------------------------------
# Когда рядом лежит собранный фронт, API отдаёт его сам: в установке одной
# командой отдельного nginx нет. В разработке каталога нет — блок молча
# пропускается, фронт живёт на своём dev-сервере.
_STATIC = Path(__file__).parent / "static"

if _STATIC.is_dir():
    app.mount("/assets", StaticFiles(directory=_STATIC / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def spa(path: str) -> FileResponse:
        """
        Любой неизвестный адрес отдаём в index.html: маршруты панели живут
        в браузере, и перезагрузка страницы на /containers/abc не должна
        приводить к 404.
        """
        candidate = _STATIC / path

        if path != "" and candidate.is_file():
            return FileResponse(candidate)

        return FileResponse(_STATIC / "index.html")
