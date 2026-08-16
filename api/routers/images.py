from __future__ import annotations

import asyncio

from docker.errors import APIError
from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect

from schemas import BuildRequest, Image, JobStatus, PullRequest
from services.docker_client import get_client, get_image
from services.jobs import make_context_tar, registry
from services.mappers import to_image

router = APIRouter(prefix="/api/images", tags=["images"])


@router.get("", response_model=list[Image])
async def list_images(all: bool = Query(False, description="Включая промежуточные слои")) -> list[Image]:
    def fetch():
        client = get_client()
        images = client.images.list(all=all)
        usage: dict[str, int] = {}

        for container in client.containers.list(all=True):
            image = container.attrs.get("Image")
            if image is not None:
                usage[image] = usage.get(image, 0) + 1

        return images, usage

    images, usage = await asyncio.to_thread(fetch)
    return [to_image(item, usage) for item in images]


@router.post("/build", response_model=JobStatus, status_code=202)
async def build_image(request: BuildRequest) -> JobStatus:
    """Стартует сборку и сразу возвращает задачу — лог читается по WebSocket."""
    context = make_context_tar(request.dockerfile, request.files)
    client = get_client()

    def make_stream():
        context.seek(0)
        return client.api.build(
            fileobj=context,
            custom_context=True,
            tag=request.tag,
            buildargs=request.build_args or None,
            nocache=request.no_cache,
            pull=request.pull,
            rm=True,
            decode=True,
        )

    job = registry.start("build", make_stream)
    job.emit(f"$ docker build -t {request.tag} .")

    return job.to_status()


@router.post("/pull", response_model=JobStatus, status_code=202)
async def pull_image(request: PullRequest) -> JobStatus:
    client = get_client()

    def make_stream():
        return client.api.pull(request.repository, tag=request.tag, stream=True, decode=True)

    job = registry.start("pull", make_stream)
    job.emit(f"$ docker pull {request.repository}:{request.tag}")

    return job.to_status()


@router.get("/jobs", response_model=list[JobStatus])
async def list_jobs() -> list[JobStatus]:
    return [job.to_status() for job in registry.list()]


@router.get("/jobs/{job_id}", response_model=JobStatus)
async def get_job(job_id: str) -> JobStatus:
    job = registry.get(job_id)

    if job is None:
        raise HTTPException(status_code=404, detail="Задача не найдена")

    return job.to_status()


@router.websocket("/jobs/{job_id}/stream")
async def stream_job(websocket: WebSocket, job_id: str) -> None:
    await websocket.accept()
    job = registry.get(job_id)

    if job is None:
        await websocket.close(code=4404, reason="Задача не найдена")
        return

    try:
        async for event in job.subscribe():
            await websocket.send_json({"type": "event", **event.model_dump()})

        await websocket.send_json({"type": "done", "state": job.state, "error": job.error})
    except WebSocketDisconnect:
        return

    try:
        await websocket.close(code=1000)
    except RuntimeError:
        pass


@router.post("/{image_id}/tag", status_code=204)
async def tag_image(image_id: str, repository: str = Query(...), tag: str = Query("latest")) -> None:
    image = await asyncio.to_thread(get_image, image_id)

    try:
        await asyncio.to_thread(lambda: image.tag(repository, tag=tag))
    except APIError as exc:
        raise HTTPException(status_code=409, detail=str(exc.explanation or exc)) from exc


@router.delete("/prune", status_code=200)
async def prune_images(dangling_only: bool = Query(True)) -> dict:
    filters = {"dangling": True} if dangling_only else {}

    def run():
        return get_client().images.prune(filters=filters)

    result = await asyncio.to_thread(run)
    return {
        "deleted": len(result.get("ImagesDeleted") or []),
        "reclaimed": int(result.get("SpaceReclaimed") or 0),
    }


@router.delete("/{image_id}", status_code=204)
async def remove_image(image_id: str, force: bool = Query(False), noprune: bool = Query(False)) -> None:
    def run():
        get_client().images.remove(image=image_id, force=force, noprune=noprune)

    try:
        await asyncio.to_thread(run)
    except APIError as exc:
        raise HTTPException(status_code=409, detail=str(exc.explanation or exc)) from exc
