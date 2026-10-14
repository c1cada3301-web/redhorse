from __future__ import annotations

import asyncio

from docker.errors import APIError
from fastapi import APIRouter, HTTPException, Query
from requests.exceptions import ConnectionError as DockerConnectionError
from requests.exceptions import ReadTimeout

from services import cleanup
from services.disk_usage import disk_usage, invalidate
from services.docker_client import get_client, get_long_client

router = APIRouter(prefix="/api/cleanup", tags=["cleanup"])


@router.get("/preview")
async def preview() -> dict:
    """Что именно удалится, с именами и размерами — до нажатия кнопки."""

    # df общий с /system/df: Docker не считает место двумя запросами сразу.
    df = await disk_usage()

    try:
        networks = await asyncio.to_thread(
            lambda: get_client().api.networks(filters={"dangling": True})
        )
    except APIError as exc:
        raise HTTPException(status_code=502, detail=str(exc.explanation or exc)) from exc

    return cleanup.build_preview(df, networks)


@router.post("/{target}")
async def prune(
    target: cleanup.Target,
    all_unused: bool = Query(
        False,
        description="Образы: и с тегами, не только висячие. Тома: и именованные, не только анонимные",
    ),
) -> dict:
    """Запускает docker prune по одному типу объектов и возвращает освобождённое место."""
    try:
        return await asyncio.to_thread(cleanup.prune, get_long_client(), target, all_unused)
    except APIError as exc:
        raise HTTPException(status_code=502, detail=str(exc.explanation or exc)) from exc
    except (ReadTimeout, DockerConnectionError) as exc:
        # Docker не отменяет prune при обрыве запроса — очистка, скорее всего, ещё идёт.
        raise HTTPException(
            status_code=504,
            detail="Docker не ответил вовремя — очистка может ещё идти, обновите страницу позже",
        ) from exc
    finally:
        invalidate()
