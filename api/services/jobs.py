"""Долгие операции Docker (сборка, pull) как задачи с живым логом."""

from __future__ import annotations

import asyncio
import contextlib
import io
import posixpath
import tarfile
import time
import uuid
from collections import OrderedDict
from collections.abc import AsyncIterator, Callable, Iterable
from typing import Any, Literal

from config import get_settings
from schemas import JobEvent, JobStatus
from services.streaming import iter_in_thread

JobKind = Literal["build", "pull"]

_SENTINEL = object()

# Сколько сборок и pull'ов крутим одновременно: остальные ждут очереди.
_MAX_PARALLEL_JOBS = 2

# Потолок очереди подписчика — залипший вебсокет не должен раздувать память.
_SUBSCRIBER_QUEUE = 512


class Job:
    """Держит накопленный лог и рассылает новые события подписчикам."""

    def __init__(self, kind: JobKind) -> None:
        self.id = uuid.uuid4().hex[:12]
        self.kind: JobKind = kind
        self.state: Literal["running", "success", "error"] = "running"
        self.started_at = time.time() * 1000
        self.finished_at: float | None = None
        self.error: str | None = None
        self.events: list[JobEvent] = []
        self._subscribers: set[asyncio.Queue[Any]] = set()

    def emit(self, text: str, stream: str = "stdout") -> None:
        event = JobEvent(ts=time.time() * 1000, text=text, stream=stream)  # type: ignore[arg-type]
        self.events.append(event)

        for queue in self._subscribers:
            if queue.full():
                # Клиент не читает — теряем самое старое, но не растём в памяти.
                with contextlib.suppress(asyncio.QueueEmpty):
                    queue.get_nowait()
            queue.put_nowait(event)

    def finish(self, error: str | None = None) -> None:
        self.state = "error" if error is not None else "success"
        self.error = error
        self.finished_at = time.time() * 1000

        for queue in self._subscribers:
            if queue.full():
                with contextlib.suppress(asyncio.QueueEmpty):
                    queue.get_nowait()
            queue.put_nowait(_SENTINEL)

    async def subscribe(self) -> AsyncIterator[JobEvent]:
        """Отдаёт уже накопленное, затем — живой хвост."""
        queue: asyncio.Queue[Any] = asyncio.Queue(maxsize=_SUBSCRIBER_QUEUE)
        backlog = list(self.events)
        self._subscribers.add(queue)

        try:
            for event in backlog:
                yield event

            # Пока отдавали backlog, задача могла дописать события и завершиться:
            # каждый yield — точка переключения. Раньше здесь стоял ранний выход
            # по состоянию, и финал сборки терялся. Теперь дочерпываем очередь.
            while True:
                try:
                    item = queue.get_nowait()
                except asyncio.QueueEmpty:
                    break
                if item is _SENTINEL:
                    return
                yield item

            if self.state != "running":
                return

            while True:
                item = await queue.get()
                if item is _SENTINEL:
                    return
                yield item
        finally:
            self._subscribers.discard(queue)

    def to_status(self) -> JobStatus:
        return JobStatus(
            id=self.id,
            kind=self.kind,
            state=self.state,
            startedAt=self.started_at,
            finishedAt=self.finished_at,
            error=self.error,
            events=self.events,
        )


class JobRegistry:
    def __init__(self) -> None:
        self._jobs: OrderedDict[str, Job] = OrderedDict()
        self._tasks: dict[str, asyncio.Task[None]] = {}
        self._slots = asyncio.Semaphore(_MAX_PARALLEL_JOBS)

    def get(self, job_id: str) -> Job | None:
        return self._jobs.get(job_id)

    def list(self) -> list[Job]:
        return list(reversed(self._jobs.values()))

    def start(self, kind: JobKind, make_iterator: Callable[[], Iterable[dict]]) -> Job:
        job = Job(kind)
        self._jobs[job.id] = job
        self._prune()

        task = asyncio.create_task(self._run(job, make_iterator))
        self._tasks[job.id] = task
        task.add_done_callback(lambda _: self._tasks.pop(job.id, None))

        return job

    async def _run(self, job: Job, make_iterator: Callable[[], Iterable[dict]]) -> None:
        # Параллельные сборки забивают диск слоями и CPU — держим очередь.
        async with self._slots:
            await self._drain(job, make_iterator)

    async def _drain(self, job: Job, make_iterator: Callable[[], Iterable[dict]]) -> None:
        try:
            async for chunk in iter_in_thread(make_iterator, queue_size=256):
                for text, stream in _render(chunk):
                    job.emit(text, stream)

                if isinstance(chunk, dict) and chunk.get("error") is not None:
                    job.finish(error=str(chunk["error"]))
                    return
        except Exception as exc:
            job.emit(str(exc), "stderr")
            job.finish(error=str(exc))
            return

        job.finish()

    def _prune(self) -> None:
        """Убирает самые старые завершённые задачи.

        Раньше проход останавливался на первой незавершённой — из-за одной долгой
        сборки реестр переставал чиститься совсем и рос без предела.
        """
        limit = get_settings().build_history

        finished = [job_id for job_id, job in self._jobs.items() if job.state != "running"]
        excess = len(self._jobs) - limit

        for job_id in finished[:max(0, excess)]:
            self._jobs.pop(job_id, None)


def _render(chunk: Any) -> list[tuple[str, str]]:
    """Docker отдаёт разнородный JSON: stream / status / errorDetail."""
    if not isinstance(chunk, dict):
        return [(str(chunk).rstrip(), "stdout")]

    out: list[tuple[str, str]] = []

    if (stream := chunk.get("stream")) is not None:
        for line in str(stream).splitlines():
            if line.strip() != "":
                out.append((line, "stdout"))

    if (status := chunk.get("status")) is not None:
        progress = chunk.get("progress") or ""
        layer = chunk.get("id")
        prefix = f"{layer}: " if layer else ""
        out.append((f"{prefix}{status} {progress}".rstrip(), "stdout"))

    if (error := chunk.get("error")) is not None:
        for line in str(error).splitlines():
            out.append((line, "stderr"))

    return out


def make_context_tar(dockerfile: str, files: dict[str, str]) -> io.BytesIO:
    """Собирает build-контекст в памяти: Dockerfile плюс файлы для COPY."""
    buffer = io.BytesIO()

    with tarfile.open(fileobj=buffer, mode="w") as tar:
        _add(tar, "Dockerfile", dockerfile)

        for name, content in files.items():
            safe = safe_context_path(name)
            if safe is None or safe == "Dockerfile":
                continue
            _add(tar, safe, content)

    buffer.seek(0)
    return buffer


def safe_context_path(name: str) -> str | None:
    """Нормализует путь внутри контекста; None — если он ведёт наружу.

    Раньше здесь просто вырезалась подстрока `..`. Обход это закрывало, но такой
    чёрный список хрупок: достаточно однажды поменять логику рядом, и дыра
    вернётся. Нормализуем путь и проверяем результат явно.
    """
    candidate = name.strip().replace("\\", "/")

    if candidate == "" or candidate.startswith("/"):
        return None

    normalized = posixpath.normpath(candidate)

    if normalized in {".", ".."} or normalized.startswith("../") or normalized.startswith("/"):
        return None

    return normalized


def _add(tar: tarfile.TarFile, name: str, content: str) -> None:
    payload = content.encode("utf-8")
    info = tarfile.TarInfo(name=name)
    # Тип фиксируем явно: обычный файл, никаких симлинков и устройств.
    info.type = tarfile.REGTYPE
    info.mode = 0o644
    info.size = len(payload)
    info.mtime = int(time.time())
    tar.addfile(info, io.BytesIO(payload))


registry = JobRegistry()
