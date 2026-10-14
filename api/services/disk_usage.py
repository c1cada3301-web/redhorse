"""Один system df на всё приложение.

Docker не выполняет два подсчёта места параллельно и отвечает 500 «a disk usage
operation is already running». Страница очистки же спрашивает и сводку, и
предпросмотр одновременно — поэтому запросы встают в очередь и делят свежий ответ.
"""

from __future__ import annotations

import asyncio
import time

from docker.errors import APIError
from fastapi import HTTPException

from services.docker_client import get_long_client

# Сводка и предпросмотр, пришедшие почти одновременно, получают один ответ.
_FRESH_S = 3.0
# Пока идёт prune или df от другого клиента, Docker держит блокировку — ждём её.
_BUSY_RETRIES = 10
_BUSY_DELAY_S = 1.5
_BUSY_MARKER = "already running"

_lock = asyncio.Lock()
_cached: tuple[float, dict] | None = None


async def disk_usage() -> dict:
    global _cached

    async with _lock:
        if _cached is not None and time.monotonic() - _cached[0] < _FRESH_S:
            return _cached[1]

        raw = await _df_with_retry()
        _cached = (time.monotonic(), raw)
        return raw


def invalidate() -> None:
    """После очистки старые размеры врут — следующий запрос спросит Docker заново."""
    global _cached
    _cached = None


async def _df_with_retry() -> dict:
    for attempt in range(_BUSY_RETRIES):
        try:
            return await asyncio.to_thread(lambda: get_long_client().df())
        except APIError as exc:
            busy = _BUSY_MARKER in str(exc.explanation or exc)
            if not busy:
                raise HTTPException(status_code=502, detail=str(exc.explanation or exc)) from exc
            if attempt == _BUSY_RETRIES - 1:
                raise HTTPException(
                    status_code=503,
                    detail="Docker занят подсчётом места или очисткой — повторите через минуту",
                ) from exc
            await asyncio.sleep(_BUSY_DELAY_S)

    raise AssertionError("unreachable")
