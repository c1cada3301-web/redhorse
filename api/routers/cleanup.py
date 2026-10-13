from __future__ import annotations

import asyncio

from docker.errors import APIError
from fastapi import APIRouter, HTTPException, Query

from services import cleanup
from services.docker_client import get_client

router = APIRouter(prefix="/api/cleanup", tags=["cleanup"])


@router.get("/preview")
async def preview() -> dict:
    """Что именно удалится, с именами и размерами — до нажатия кнопки."""

    def collect() -> dict:
        client = get_client()
        # Один df вместо пяти списков: размеры и счётчики ссылок есть только в нём.
        df = client.df()
        networks = client.api.networks(filters={"dangling": True})
        return cleanup.build_preview(df, networks)

    try:
        return await asyncio.to_thread(collect)
    except APIError as exc:
        raise HTTPException(status_code=502, detail=str(exc.explanation or exc)) from exc


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
        return await asyncio.to_thread(cleanup.prune, get_client(), target, all_unused)
    except APIError as exc:
        raise HTTPException(status_code=502, detail=str(exc.explanation or exc)) from exc
