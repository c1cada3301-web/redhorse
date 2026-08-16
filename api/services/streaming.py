"""Мост между блокирующими генераторами docker-py и asyncio."""

from __future__ import annotations

import asyncio
import inspect
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
    по себе блокирующее. При отмене потребителя поток помечается на остановку.

    Одной пометки мало: `stop` проверяется только между элементами, а поток логов
    молчаливого контейнера может блокироваться на чтении часами. Поэтому у объекта
    потока дополнительно вызывается `close()` — docker-py отдаёт для логов
    CancellableStream, закрытие которого разрывает соединение и будит чтение.
    Обычные генераторы (stats, build, pull) не трогаем: закрыть исполняющийся
    генератор из чужого потока нельзя, но данные там идут часто и остановка
    замечается сразу.
    """
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[Any] = asyncio.Queue(maxsize=queue_size)
    stop = threading.Event()
    holder: dict[str, Any] = {"stream": None}

    def put(item: Any) -> None:
        future = asyncio.run_coroutine_threadsafe(queue.put(item), loop)
        # Ждём с таймаутом, иначе медленный клиент навсегда подвесит поток.
        while not stop.is_set():
            try:
                future.result(timeout=0.25)
                return
            except TimeoutError:
                continue
            except RuntimeError:
                # Event loop уже закрыт — потребителя нет, уходим молча.
                return
        future.cancel()

    def worker() -> None:
        try:
            stream = make_iterator()
            holder["stream"] = stream

            # Отмена могла прийти, пока открывали поток.
            if stop.is_set():
                close_stream(stream)
                return

            for item in stream:
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
        close_stream(holder["stream"])


def close_stream(stream: Any) -> None:
    """Закрывает поток docker-py, если он это умеет. Генераторы пропускаем."""
    if stream is None or inspect.isgenerator(stream):
        return

    close = getattr(stream, "close", None)
    if close is None:
        return

    try:
        close()
    except Exception as exc:
        logger.debug("Не удалось закрыть поток docker: %s", exc)
