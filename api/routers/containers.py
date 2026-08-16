from __future__ import annotations

import asyncio
import time
from itertools import count

from docker.errors import APIError
from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect

from config import get_settings
from schemas import Container, ContainerStats, LogPage
from services.docker_client import get_client, get_container
from services.logs import iter_log_lines, renumber, to_docker_time
from services.mappers import to_container, to_stats
from services.streaming import iter_in_thread

router = APIRouter(prefix="/api/containers", tags=["containers"])

_ACTIONS = {
    "start": lambda c: c.start(),
    "stop": lambda c: c.stop(timeout=10),
    "restart": lambda c: c.restart(timeout=10),
    "pause": lambda c: c.pause(),
    "unpause": lambda c: c.unpause(),
    "kill": lambda c: c.kill(),
}


@router.get("", response_model=list[Container])
async def list_containers(
    all: bool = Query(True, description="Включая остановленные"),
    size: bool = Query(False, description="Считать размер слоёв — заметно медленнее"),
) -> list[Container]:
    def fetch():
        client = get_client()
        items = client.containers.list(all=all)

        if size:
            # Размеры слоёв отдаёт только низкоуровневый вызов, доклеиваем их вручную.
            extra = {item["Id"]: item for item in client.api.containers(all=all, size=True)}
            for item in items:
                found = extra.get(item.id)
                if found is not None:
                    item.attrs["SizeRw"] = found.get("SizeRw", 0)
                    item.attrs["SizeRootFs"] = found.get("SizeRootFs", 0)

        return items

    raw = await asyncio.to_thread(fetch)
    return [to_container(item) for item in raw]


@router.get("/{container_id}", response_model=Container)
async def inspect_container(container_id: str) -> Container:
    raw = await asyncio.to_thread(get_container, container_id)
    return to_container(raw)


@router.post("/{container_id}/{action}", status_code=204)
async def run_action(container_id: str, action: str) -> None:
    handler = _ACTIONS.get(action)

    if handler is None:
        raise HTTPException(status_code=400, detail=f"Неизвестное действие: {action}")

    container = await asyncio.to_thread(get_container, container_id)

    try:
        await asyncio.to_thread(handler, container)
    except APIError as exc:
        raise HTTPException(status_code=409, detail=str(exc.explanation or exc)) from exc


@router.delete("/{container_id}", status_code=204)
async def remove_container(
    container_id: str,
    force: bool = Query(False),
    volumes: bool = Query(False, description="Удалить и анонимные тома"),
) -> None:
    container = await asyncio.to_thread(get_container, container_id)

    try:
        await asyncio.to_thread(lambda: container.remove(force=force, v=volumes))
    except APIError as exc:
        raise HTTPException(status_code=409, detail=str(exc.explanation or exc)) from exc


@router.get("/{container_id}/logs", response_model=LogPage)
async def read_logs(
    container_id: str,
    since: float | None = Query(None, description="Начало окна, мс epoch"),
    until: float | None = Query(None, description="Конец окна, мс epoch"),
    tail: int | None = Query(None, ge=1),
    stdout: bool = Query(True),
    stderr: bool = Query(True),
) -> LogPage:
    """Историю фильтрует сам Docker Engine — since/until не тянут лишнее в память."""
    settings = get_settings()
    limit = min(tail or settings.log_default_tail, settings.log_max_tail)
    container = await asyncio.to_thread(get_container, container_id)

    def fetch(want_stdout: bool, want_stderr: bool):
        return container.logs(
            stdout=want_stdout,
            stderr=want_stderr,
            timestamps=True,
            since=to_docker_time(since),
            until=to_docker_time(until),
            tail=limit,
            stream=False,
        )

    now_ms = time.time() * 1000
    lines: list = []

    try:
        for enabled, flags, label in ((stdout, (True, False), "stdout"), (stderr, (False, True), "stderr")):
            if not enabled:
                continue
            chunk = await asyncio.to_thread(fetch, *flags)
            lines.extend(iter_log_lines([chunk], label, now_ms=now_ms))
    except APIError as exc:
        raise HTTPException(status_code=502, detail=str(exc.explanation or exc)) from exc

    lines.sort(key=lambda line: line.ts)
    truncated = len(lines) > limit

    return LogPage(lines=renumber(lines[-limit:]), truncated=truncated)


@router.websocket("/{container_id}/logs/stream")
async def stream_logs(
    websocket: WebSocket,
    container_id: str,
    since: float | None = None,
    tail: int | None = None,
    stdout: bool = True,
    stderr: bool = True,
) -> None:
    """Живой поток строк. Клиент шлёт since от последней полученной строки при реконнекте."""
    await websocket.accept()

    settings = get_settings()
    limit = min(tail if tail is not None else settings.log_default_tail, settings.log_max_tail)

    try:
        container = await asyncio.to_thread(get_container, container_id)
    except HTTPException as exc:
        await websocket.close(code=4404, reason=str(exc.detail))
        return

    def make_stream(want_stdout: bool, want_stderr: bool):
        def factory():
            return container.logs(
                stdout=want_stdout,
                stderr=want_stderr,
                timestamps=True,
                since=to_docker_time(since),
                tail=limit if since is None else 0,
                stream=True,
                follow=True,
            )

        return factory

    ids = count()
    now_ms = time.time() * 1000
    queue: asyncio.Queue = asyncio.Queue(maxsize=256)

    async def pump(factory, label: str) -> None:
        try:
            async for chunk in iter_in_thread(factory):
                batch = [line.model_dump() for line in iter_log_lines([chunk], label, ids=ids, now_ms=now_ms)]
                if batch:
                    await queue.put(batch)
        finally:
            await queue.put(None)

    pumps = [
        asyncio.create_task(pump(make_stream(*flags), label))
        for enabled, flags, label in ((stdout, (True, False), "stdout"), (stderr, (False, True), "stderr"))
        if enabled
    ]

    if not pumps:
        await _safe_close(websocket, 1000, "нечего читать")
        return

    remaining = len(pumps)

    try:
        while remaining > 0:
            batch = await queue.get()

            if batch is None:
                remaining -= 1
                continue

            await websocket.send_json({"type": "lines", "lines": batch})
    except WebSocketDisconnect:
        return
    except Exception as exc:
        await _safe_close(websocket, 4500, str(exc))
        return
    finally:
        for task in pumps:
            task.cancel()

    await _safe_close(websocket, 1000, "поток закрыт")


@router.get("/{container_id}/stats", response_model=ContainerStats)
async def read_stats(container_id: str) -> ContainerStats:
    container = await asyncio.to_thread(get_container, container_id)
    sample = await asyncio.to_thread(lambda: container.stats(stream=False))
    return to_stats(sample)


@router.websocket("/{container_id}/stats/stream")
async def stream_stats(websocket: WebSocket, container_id: str) -> None:
    await websocket.accept()

    try:
        container = await asyncio.to_thread(get_container, container_id)
    except HTTPException as exc:
        await websocket.close(code=4404, reason=str(exc.detail))
        return

    def make_stream():
        return container.stats(stream=True, decode=True)

    try:
        async for sample in iter_in_thread(make_stream, queue_size=8):
            await websocket.send_json(to_stats(sample).model_dump(by_alias=True))
    except WebSocketDisconnect:
        return
    except Exception as exc:
        await _safe_close(websocket, 4500, str(exc))


async def _safe_close(websocket: WebSocket, code: int, reason: str) -> None:
    try:
        await websocket.close(code=code, reason=reason[:120])
    except RuntimeError:
        pass
