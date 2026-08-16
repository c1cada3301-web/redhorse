from __future__ import annotations

import logging
from functools import lru_cache

import docker
from docker.errors import DockerException
from fastapi import HTTPException

from config import get_settings

logger = logging.getLogger(__name__)


@lru_cache
def get_client() -> docker.DockerClient:
    """Ленивый клиент: без сокета приложение всё равно поднимется и вернёт 503."""
    settings = get_settings()

    try:
        if settings.docker_host is not None:
            return docker.DockerClient(base_url=settings.docker_host)
        return docker.from_env()
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
