"""Чтение логов контейнера: разбор строк, уровни, фильтр по времени."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from itertools import count

from schemas import LogLevel, LogLine, LogStream

# Формат docker с timestamps=True: «2026-08-17T00:11:22.123456789Z текст».
_TS_RE = re.compile(rb"^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s?(.*)$", re.DOTALL)

# Уровень ищем в первых ~120 символах: там живут и «INFO», и «level=warn», и «[ERROR]».
_LEVEL_PATTERNS: tuple[tuple[LogLevel, re.Pattern[str]], ...] = (
    ("error", re.compile(r"\b(error|err|fatal|panic|critical|crit|emerg|alert)\b", re.I)),
    ("warn", re.compile(r"\b(warn|warning)\b", re.I)),
    ("debug", re.compile(r"\b(debug|dbg|trace|verbose)\b", re.I)),
    ("info", re.compile(r"\b(info|notice|log)\b", re.I)),
)

_LEVEL_SCAN_CHARS = 120


def detect_level(text: str) -> LogLevel:
    head = text[:_LEVEL_SCAN_CHARS]

    for level, pattern in _LEVEL_PATTERNS:
        if pattern.search(head):
            return level

    return "info"


def parse_line(raw: bytes, stream: LogStream, line_id: int, fallback_ts: float) -> LogLine:
    match = _TS_RE.match(raw)

    if match is not None:
        ts = _iso_to_ms(match.group(1).decode("utf-8", "replace")) or fallback_ts
        body = match.group(2)
    else:
        ts = fallback_ts
        body = raw

    text = body.decode("utf-8", "replace").rstrip("\r\n")

    return LogLine(id=line_id, ts=ts, level=detect_level(text), stream=stream, text=text)


def _iso_to_ms(value: str) -> float | None:
    cleaned = value.replace("Z", "+00:00")

    if "." in cleaned:
        head, _, tail = cleaned.partition(".")
        fraction, _, offset = tail.partition("+")
        cleaned = f"{head}.{fraction[:6]:0<6}+{offset}"

    try:
        return datetime.fromisoformat(cleaned).timestamp() * 1000
    except ValueError:
        return None


def to_docker_time(value: float | None) -> datetime | None:
    """Фронт присылает миллисекунды epoch, Docker хочет datetime."""
    if value is None:
        return None
    return datetime.fromtimestamp(value / 1000, tz=timezone.utc)


def iter_log_lines(chunks, stream: LogStream, ids=None, now_ms: float = 0.0):
    """Разворачивает байтовые порции docker-py в LogLine.

    docker-py снимает мультиплексный заголовок сам и теряет признак потока,
    поэтому stdout и stderr читаются двумя отдельными вызовами, а метка
    приходит сюда снаружи. Одна порция может нести несколько строк.
    """
    counter = ids if ids is not None else count()

    for chunk in chunks:
        if not chunk:
            continue
        for raw in chunk.splitlines():
            if raw.strip() == b"":
                continue
            yield parse_line(raw, stream, next(counter), now_ms)


def renumber(lines: list[LogLine]) -> list[LogLine]:
    """Сквозная нумерация после слияния stdout и stderr."""
    return [line.model_copy(update={"id": index}) for index, line in enumerate(lines)]
