"""Один поток статистики на все контейнеры.

Docker не умеет отдавать stats пачкой — на каждый контейнер нужен свой поток.
Держать по вебсокету на контейнер в браузере расточительно, поэтому потоки живут
здесь, а наружу уходит одна подписка. Когда слушателей нет, потоки гасятся.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging

from config import get_settings
from services.docker_client import get_client
from services.mappers import to_stats
from services.streaming import iter_in_thread

logger = logging.getLogger(__name__)

# Как часто пересматриваем список запущенных контейнеров.
_RESCAN_INTERVAL = 5.0


class StatsHub:
    def __init__(self) -> None:
        self._latest: dict[str, dict] = {}
        self._workers: dict[str, asyncio.Task[None]] = {}
        self._subscribers: set[asyncio.Queue[dict]] = set()
        self._scanner: asyncio.Task[None] | None = None

    @property
    def snapshot(self) -> dict[str, dict]:
        return dict(self._latest)

    async def subscribe(self):
        queue: asyncio.Queue[dict] = asyncio.Queue(maxsize=256)
        self._subscribers.add(queue)
        self._ensure_running()

        try:
            # Новому подписчику сразу отдаём то, что уже накоплено.
            for container_id, stats in self._latest.items():
                yield {"id": container_id, **stats}

            while True:
                yield await queue.get()
        finally:
            self._subscribers.discard(queue)
            if not self._subscribers:
                await self._shutdown()

    def _ensure_running(self) -> None:
        if self._scanner is None or self._scanner.done():
            self._scanner = asyncio.create_task(self._scan_loop())

    async def _shutdown(self) -> None:
        if self._scanner is not None:
            self._scanner.cancel()
            self._scanner = None

        for task in list(self._workers.values()):
            task.cancel()

        self._workers.clear()
        self._latest.clear()

    async def _scan_loop(self) -> None:
        while True:
            try:
                await self._sync_workers()
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.warning("Не удалось обновить список контейнеров: %s", exc)

            await asyncio.sleep(_RESCAN_INTERVAL)

    async def _sync_workers(self) -> None:
        def fetch_running() -> list[str]:
            return [item.id for item in get_client().containers.list()]

        running = set(await asyncio.to_thread(fetch_running))

        for container_id in running - self._workers.keys():
            self._workers[container_id] = asyncio.create_task(self._watch(container_id))

        for container_id in self._workers.keys() - running:
            self._workers.pop(container_id).cancel()
            self._latest.pop(container_id, None)
            self._broadcast({"id": container_id, "gone": True})

    async def _watch(self, container_id: str) -> None:
        def make_stream():
            return get_client().containers.get(container_id).stats(stream=True, decode=True)

        try:
            async for sample in iter_in_thread(make_stream, queue_size=4):
                stats = to_stats(sample).model_dump(by_alias=True)
                self._latest[container_id] = stats
                self._broadcast({"id": container_id, **stats})
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.info("Поток статистики %s остановлен: %s", container_id[:12], exc)
        finally:
            self._workers.pop(container_id, None)
            # Поток мог оборваться и без остановки контейнера (например, при
            # restart). Не помечая это сразу, фронт до следующего скана показывал
            # бы замёрзшие цифры как живые.
            if self._latest.pop(container_id, None) is not None:
                self._broadcast({"id": container_id, "gone": True})

    def _broadcast(self, message: dict) -> None:
        for queue in self._subscribers:
            if queue.full():
                # Медленный клиент не должен тормозить остальных — теряем старое.
                with contextlib.suppress(asyncio.QueueEmpty):
                    queue.get_nowait()
            queue.put_nowait(message)


hub = StatsHub()


def stats_interval() -> float:
    return get_settings().stats_interval
