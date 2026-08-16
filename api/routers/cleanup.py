from __future__ import annotations

import asyncio
from typing import Literal

from docker.errors import APIError
from fastapi import APIRouter, HTTPException, Query

from services.docker_client import get_client
from services.mappers import parse_docker_time

router = APIRouter(prefix="/api/cleanup", tags=["cleanup"])

Target = Literal["containers", "images", "volumes", "networks", "builder"]

# Сети, которые Docker создаёт сам — их не удаляет даже prune, но в списке
# «неиспользуемых» они бы мозолили глаза.
_PREDEFINED_NETWORKS = {"bridge", "host", "none"}

# Состояния, из которых контейнер уже не вернётся сам.
_DEAD_STATES = {"exited", "created", "dead"}


@router.get("/preview")
async def preview() -> dict:
    """Что именно удалится, с именами и размерами — до нажатия кнопки."""

    def collect() -> dict:
        client = get_client()

        containers = [
            {
                "id": item.id,
                "name": item.name,
                "image": (item.attrs.get("Config") or {}).get("Image") or "",
                "status": item.status,
                "size": int(item.attrs.get("SizeRw") or 0),
                "createdAt": parse_docker_time(item.attrs.get("Created")) or 0,
            }
            for item in client.containers.list(all=True)
            if item.status in _DEAD_STATES
        ]

        images = [
            {
                "id": item.id,
                "name": "<none>",
                "size": int(item.attrs.get("Size") or 0),
                "createdAt": parse_docker_time(item.attrs.get("Created")) or 0,
            }
            for item in client.images.list(filters={"dangling": True})
        ]

        volumes = [
            {
                "id": item.name,
                "name": item.name,
                "size": int(((item.attrs.get("UsageData") or {}).get("Size")) or 0),
                "createdAt": 0,
                "mountpoint": item.attrs.get("Mountpoint") or "",
            }
            for item in client.volumes.list(filters={"dangling": True})
        ]

        networks = [
            {
                "id": item.id,
                "name": item.name,
                "driver": item.attrs.get("Driver") or "",
                "size": 0,
                "createdAt": parse_docker_time(item.attrs.get("Created")) or 0,
            }
            for item in client.networks.list(greedy=True)
            if item.name not in _PREDEFINED_NETWORKS and not (item.attrs.get("Containers") or {})
        ]

        build_cache = sum(
            int(entry.get("Size") or 0) for entry in (client.df().get("BuildCache") or [])
        )

        return {
            "containers": containers,
            "images": images,
            "volumes": volumes,
            "networks": networks,
            "builder": [],
            "builderSize": build_cache,
        }

    try:
        return await asyncio.to_thread(collect)
    except APIError as exc:
        raise HTTPException(status_code=502, detail=str(exc.explanation or exc)) from exc


@router.post("/{target}")
async def prune(
    target: Target,
    all_unused: bool = Query(
        False,
        description="Для образов: удалять не только без тега, но и все неиспользуемые",
    ),
) -> dict:
    """Запускает docker prune по одному типу объектов и возвращает освобождённое место."""

    def run() -> dict:
        client = get_client()

        if target == "containers":
            result = client.containers.prune()
            return _summary(result, "ContainersDeleted")

        if target == "images":
            filters = {} if all_unused else {"dangling": True}
            result = client.images.prune(filters=filters)
            return _summary(result, "ImagesDeleted")

        if target == "volumes":
            result = client.volumes.prune()
            return _summary(result, "VolumesDeleted")

        if target == "networks":
            result = client.networks.prune()
            return _summary(result, "NetworksDeleted")

        result = client.api.prune_builds()
        return _summary(result, "CachesDeleted")

    try:
        return await asyncio.to_thread(run)
    except APIError as exc:
        raise HTTPException(status_code=502, detail=str(exc.explanation or exc)) from exc


def _summary(result: dict, key: str) -> dict:
    deleted = result.get(key) or []

    return {
        "deleted": len(deleted),
        "reclaimed": int(result.get("SpaceReclaimed") or 0),
    }
