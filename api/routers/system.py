from __future__ import annotations

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services.docker_client import get_client
from services.stats_hub import hub

router = APIRouter(prefix="/api/system", tags=["system"])


@router.websocket("/stats/stream")
async def stream_all_stats(websocket: WebSocket) -> None:
    """Статистика по всем запущенным контейнерам одной подпиской."""
    await websocket.accept()

    try:
        async for message in hub.subscribe():
            await websocket.send_json(message)
    except WebSocketDisconnect:
        return
    except Exception:
        try:
            await websocket.close(code=4500)
        except RuntimeError:
            pass


@router.get("/ping")
async def ping() -> dict:
    """Живой ли Docker Engine — фронт показывает этим статус подключения."""
    try:
        await asyncio.to_thread(lambda: get_client().ping())
    except Exception as exc:
        return {"ok": False, "error": str(exc)}

    return {"ok": True}


@router.get("/info")
async def info() -> dict:
    raw = await asyncio.to_thread(lambda: get_client().info())

    return {
        "name": raw.get("Name"),
        "serverVersion": raw.get("ServerVersion"),
        "operatingSystem": raw.get("OperatingSystem"),
        "architecture": raw.get("Architecture"),
        "cpus": raw.get("NCPU"),
        "memory": raw.get("MemTotal"),
        "containers": raw.get("Containers"),
        "containersRunning": raw.get("ContainersRunning"),
        "containersStopped": raw.get("ContainersStopped"),
        "images": raw.get("Images"),
    }


@router.get("/df")
async def disk_usage() -> dict:
    raw = await asyncio.to_thread(lambda: get_client().df())

    def total(key: str, field: str = "Size") -> int:
        return sum(int(item.get(field) or 0) for item in (raw.get(key) or []))

    return {
        "images": total("Images"),
        "containers": total("Containers", "SizeRw"),
        "volumes": sum(
            int(((item.get("UsageData") or {}).get("Size")) or 0) for item in (raw.get("Volumes") or [])
        ),
        "buildCache": total("BuildCache"),
    }


@router.get("/networks")
async def list_networks() -> list[dict]:
    def fetch():
        return [
            {
                "id": net.id,
                "name": net.name,
                "driver": net.attrs.get("Driver"),
                "scope": net.attrs.get("Scope"),
                "internal": net.attrs.get("Internal", False),
                "containers": sorted(
                    entry.get("Name", "") for entry in (net.attrs.get("Containers") or {}).values()
                ),
                "subnets": [
                    cfg.get("Subnet")
                    for cfg in ((net.attrs.get("IPAM") or {}).get("Config") or [])
                    if cfg.get("Subnet")
                ],
            }
            for net in get_client().networks.list()
        ]

    return await asyncio.to_thread(fetch)


@router.get("/volumes")
async def list_volumes() -> list[dict]:
    def fetch():
        return [
            {
                "name": vol.name,
                "driver": vol.attrs.get("Driver"),
                "mountpoint": vol.attrs.get("Mountpoint"),
                "createdAt": vol.attrs.get("CreatedAt"),
                "size": int(((vol.attrs.get("UsageData") or {}).get("Size")) or 0),
                "labels": vol.attrs.get("Labels") or {},
            }
            for vol in get_client().volumes.list()
        ]

    return await asyncio.to_thread(fetch)
