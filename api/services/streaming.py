"""Мост между блокирующими генераторами docker-py и asyncio."""

from __future__ import annotations

import asyncio
import logging
import threading
from collections.abc import AsyncIterator, Callable, Iterable
from typing import Any

logger = logging.getLogger(__name__)

_SENTINEL = object()


async def iter_in_thread(
    make_iterator: Callable[[], Iterable[Any]],
    *,
    queue_size: int = 512,
) -> AsyncIterator[Any]:
    """Крутит блокирующий генератор в отдельном потоке и отдаёт элементы в asyncio.

    Генератор создаётся уже внутри потока: у docker-py открытие потока логов само
    по себе блокирующее. При отмене потребителя поток помечается на остановку и
    докачивает очередь в пустоту, не мешая event loop.
    """
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[Any] = asyncio.Queue(maxsize=queue_size)
    stop = threading.Event()

    def put(item: Any) -> None:
        future = asyncio.run_coroutine_threadsafe(queue.put(item), loop)
        # Ждём с таймаутом, иначе медленный клиент навсегда подвесит поток.
        while not stop.is_set():
            try:
                future.result(timeout=0.25)
                return
            except TimeoutError:
                continue
        future.cancel()

    def worker() -> None:
        try:
            for item in make_iterator():
                if stop.is_set():
                    return
                put(item)
        except Exception as exc:  # поток не должен падать молча
            if not stop.is_set():
                logger.warning("Поток docker прерван: %s", exc)
                put(exc)
        finally:
            if not stop.is_set():
                put(_SENTINEL)

    thread = threading.Thread(target=worker, daemon=True, name="docker-stream")
    thread.start()

    try:
        while True:
            item = await queue.get()

            if item is _SENTINEL:
                return
            if isinstance(item, Exception):
                raise item

            yield item
    finally:
        stop.set()
