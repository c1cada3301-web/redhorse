"""Предпросмотр и запуск prune так, чтобы список совпадал с тем, что Docker удалит.

Всё строится из одного ответа ``/system/df``: там уже посчитаны размеры контейнеров,
счётчики ссылок томов и занятость образов. Отдельные list-запросы этих полей
не отдают, и размеры в предпросмотре выходили нулевыми.
"""

from __future__ import annotations

from typing import Any, Literal

from services.mappers import parse_docker_time

Target = Literal["containers", "images", "volumes", "networks", "builder"]

# Состояния, из которых контейнер уже не вернётся сам; container prune берёт именно их.
_STOPPED_STATES = {"exited", "created", "dead"}

# Метка, которой Docker 23+ помечает анонимные тома. Без флага all prune трогает только их.
_ANONYMOUS_VOLUME_LABEL = "com.docker.volume.anonymous"

_UNTAGGED = {"<none>:<none>", ""}


def _created(value: Any) -> float:
    """В df контейнеры и образы отдают unix-секунды, тома — строку RFC3339."""
    if isinstance(value, (int, float)):
        return float(value) * 1000 if value > 0 else 0
    if isinstance(value, str):
        return parse_docker_time(value) or 0
    return 0


def _is_untagged(image: dict) -> bool:
    tags = image.get("RepoTags") or []
    return all(tag in _UNTAGGED for tag in tags)


def _unique_size(image: dict) -> int:
    """Общие слои освободятся, только если уйдут все образы на них, — их не обещаем."""
    size = int(image.get("Size") or 0)
    shared = int(image.get("SharedSize") or 0)
    return max(size - shared, 0) if shared > 0 else size


def stopped_containers(df: dict) -> list[dict]:
    return [
        {
            "id": item.get("Id", ""),
            "name": ((item.get("Names") or [""])[0]).lstrip("/"),
            "image": item.get("Image") or "",
            "status": item.get("State") or "",
            "size": int(item.get("SizeRw") or 0),
            "createdAt": _created(item.get("Created")),
        }
        for item in (df.get("Containers") or [])
        if item.get("State") in _STOPPED_STATES
    ]


def unused_images(df: dict) -> list[dict]:
    """Образы без единого контейнера. ``extended`` — с тегом: уйдут только при all_unused."""
    return [
        {
            "id": item.get("Id", ""),
            "name": "<none>" if _is_untagged(item) else ", ".join(item.get("RepoTags") or []),
            "size": _unique_size(item),
            "createdAt": _created(item.get("Created")),
            "extended": not _is_untagged(item),
        }
        for item in (df.get("Images") or [])
        # -1 значит «не посчитано» — такой образ не трогаем, вдруг он занят.
        if int(item.get("Containers", -1)) == 0
    ]


def unused_volumes(df: dict) -> list[dict]:
    """Тома без ссылок. ``extended`` — именованные: prune по умолчанию их не удаляет."""
    result = []

    for item in df.get("Volumes") or []:
        usage = item.get("UsageData") or {}
        if int(usage.get("RefCount", -1)) != 0:
            continue

        labels = item.get("Labels") or {}
        result.append(
            {
                "id": item.get("Name", ""),
                "name": item.get("Name", ""),
                "size": max(int(usage.get("Size") or 0), 0),
                "createdAt": _created(item.get("CreatedAt")),
                "mountpoint": item.get("Mountpoint") or "",
                "extended": _ANONYMOUS_VOLUME_LABEL not in labels,
            }
        )

    return result


def unused_networks(networks: list[dict]) -> list[dict]:
    """На вход — ответ /networks с фильтром dangling: встроенные сети Docker туда не попадают."""
    return [
        {
            "id": item.get("Id", ""),
            "name": item.get("Name", ""),
            "driver": item.get("Driver") or "",
            "size": 0,
            "createdAt": _created(item.get("Created")),
        }
        for item in networks
    ]


def reclaimable_build_cache(df: dict) -> int:
    """Как колонка RECLAIMABLE в docker system df: занятые и общие записи не освободятся."""
    return sum(
        int(entry.get("Size") or 0)
        for entry in (df.get("BuildCache") or [])
        if not entry.get("InUse") and not entry.get("Shared")
    )


def build_preview(df: dict, networks: list[dict]) -> dict:
    return {
        "containers": stopped_containers(df),
        "images": unused_images(df),
        "volumes": unused_volumes(df),
        "networks": unused_networks(networks),
        "builder": [],
        "builderSize": reclaimable_build_cache(df),
    }


def summarize(result: dict, key: str) -> dict:
    return {
        "deleted": len(result.get(key) or []),
        "reclaimed": int(result.get("SpaceReclaimed") or 0),
    }


def prune(client: Any, target: Target, all_unused: bool) -> dict:
    """Один prune. all_unused расширяет охват образов (с тегами) и томов (именованные)."""
    if target == "containers":
        return summarize(client.containers.prune(), "ContainersDeleted")

    if target == "images":
        # Без фильтра Docker удаляет только висячие — «все» включаются явным dangling=false.
        filters = {"dangling": not all_unused}
        return summarize(client.images.prune(filters=filters), "ImagesDeleted")

    if target == "volumes":
        filters = {"all": True} if all_unused else None
        return summarize(client.volumes.prune(filters=filters), "VolumesDeleted")

    if target == "networks":
        return summarize(client.networks.prune(), "NetworksDeleted")

    # all=True — весь неиспользуемый кеш, как и обещает предпросмотр.
    return summarize(client.api.prune_builds(all=True), "CachesDeleted")
