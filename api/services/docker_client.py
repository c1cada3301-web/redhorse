from __future__ import annotations

import logging
from functools import lru_cache

import docker
from docker.errors import DockerException
from fastapi import HTTPException

from config import get_settings

logger = logging.getLogger(__name__)


# Prune и df на большом хосте идут минутами; стандартных 60 секунд docker-py не хватает,
# и запрос падал по таймауту, хотя Docker продолжал работу.
LONG_TIMEOUT_S = 1800


@lru_cache
def get_client() -> docker.DockerClient:
    """Ленивый клиент: без сокета приложение всё равно поднимется и вернёт 503."""
    return _make_client(timeout=None)


@lru_cache
def get_long_client() -> docker.DockerClient:
    """Клиент для долгих операций — очистки и подсчёта места на диске."""
    return _make_client(timeout=LONG_TIMEOUT_S)


def _make_client(timeout: int | None) -> docker.DockerClient:
    settings = get_settings()
    extra = {} if timeout is None else {"timeout": timeout}

    try:
        if settings.docker_host is not None:
            return docker.DockerClient(base_url=settings.docker_host, **extra)
        return docker.from_env(**extra)
    except DockerException as exc:
        logger.error("Docker Engine недоступен: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Docker Engine недоступен. Проброшен ли /var/run/docker.sock в контейнер?",
        ) from exc


def get_container(container_id: str):
    from docker.errors import APIError, NotFound

    try:
        return get_client().containers.get(container_id)
    except NotFound as exc:
        raise HTTPException(status_code=404, detail=f"Контейнер {container_id} не найден") from exc
    except APIError as exc:
        raise HTTPException(status_code=502, detail=str(exc.explanation or exc)) from exc


def get_image(image_id: str):
    from docker.errors import APIError, NotFound

    try:
        return get_client().images.get(image_id)
    except NotFound as exc:
        raise HTTPException(status_code=404, detail=f"Образ {image_id} не найден") from exc
    except APIError as exc:
        raise HTTPException(status_code=502, detail=str(exc.explanation or exc)) from exc
