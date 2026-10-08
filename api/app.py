from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from auth import current_user, ensure_admin, ensure_secret, mark_started
from config import get_settings
from database.session import create_schema, dispose
from routers import auth as auth_router
from routers import cleanup, containers, images, system
from security import OriginGuard, SecurityHeaders

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # Схема и первый администратор создаются до приёма запросов.
    await create_schema()
    # Секрет — до приёма запросов: без него нечем проверять сессии.
    await ensure_secret()
    await ensure_admin()
    # Окно создания администратора отсчитываем от готовности, а не от импорта.
    mark_started()
    yield
    await dispose()


# Схема API в проде не публикуется: это готовая карта для того, кто нашёл панель.
_docs = {} if not settings.is_production else {"docs_url": None, "redoc_url": None, "openapi_url": None}

app = FastAPI(
    title="RedHorse",
    description="Управление Docker: контейнеры, логи, образы.",
    version="0.1.0",
    lifespan=lifespan,
    **_docs,
)

# Порядок важен: последний добавленный выполняется первым. Origin проверяем
# до всего остального, заголовки ставим на любой ответ, включая отказы.
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(OriginGuard, trusted_origins=settings.trusted_origins)
app.add_middleware(SecurityHeaders)

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
    return {"status": "ok"}


# --- статика панели ---------------------------------------------------------
# Когда рядом лежит собранный фронт, API отдаёт его сам: в установке одной
# командой отдельного nginx нет. В разработке каталога нет — блок молча
# пропускается, фронт живёт на своём dev-сервере.
STATIC_DIR = (Path(__file__).parent / "static").resolve()


def resolve_static(path: str, root: Path = STATIC_DIR) -> Path | None:
    """
    Файл статики по пути из адреса — или None, если путь ведёт за пределы
    каталога. Без этой проверки запрос /..%2f..%2fdata/redhorse.db отдавал базу
    вместе с секретом подписи сессий.
    """
    if path == "":
        return None

    candidate = (root / path).resolve()

    if not candidate.is_relative_to(root) or not candidate.is_file():
        return None

    return candidate


class ImmutableAssets(StaticFiles):
    """Ассеты Vite с хешем в имени: кешируем навсегда, имя сменится вместе с содержимым."""

    def file_response(self, *args, **kwargs):
        response = super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response


if STATIC_DIR.is_dir():
    app.mount("/assets", ImmutableAssets(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def spa(path: str) -> FileResponse:
        """
        Любой неизвестный адрес отдаём в index.html: маршруты панели живут
        в браузере, и перезагрузка страницы на /containers/abc не должна
        приводить к 404.
        """
        # Опечатка в адресе API — это 404, а не страница панели с кодом 200.
        if path == "api" or path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Не найдено")

        found = resolve_static(path)

        if found is not None:
            return FileResponse(found)

        # index.html не кешируем: в нём ссылки на свежие ассеты после обновления.
        return FileResponse(STATIC_DIR / "index.html", headers={"Cache-Control": "no-cache"})
