from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

ContainerState = Literal["running", "exited", "paused", "restarting", "created", "dead", "removing"]
LogLevel = Literal["debug", "info", "warn", "error"]
LogStream = Literal["stdout", "stderr"]


class ContainerStats(BaseModel):
    cpu: float = 0.0
    mem: int = 0
    mem_limit: int = Field(0, alias="memLimit")
    net_rx: float = Field(0.0, alias="netRx")
    net_tx: float = Field(0.0, alias="netTx")
    blk_read: float = Field(0.0, alias="blkRead")
    blk_write: float = Field(0.0, alias="blkWrite")

    model_config = {"populate_by_name": True}


class Container(BaseModel):
    id: str
    name: str
    image: str
    state: ContainerState
    status: str
    created_at: float = Field(alias="createdAt")
    started_at: float | None = Field(None, alias="startedAt")
    ports: list[str] = []
    networks: list[str] = []
    size_rw: int = Field(0, alias="sizeRw")
    size_root_fs: int = Field(0, alias="sizeRootFs")
    health: Literal["healthy", "unhealthy", "starting", "none"] = "none"
    restarts: int = 0
    stack: str | None = None
    command: str = ""

    model_config = {"populate_by_name": True}


class LogLine(BaseModel):
    id: int
    ts: float
    level: LogLevel
    stream: LogStream
    text: str


class LogPage(BaseModel):
    lines: list[LogLine]
    truncated: bool = False


class Image(BaseModel):
    id: str
    tags: list[str] = []
    size: int = 0
    created_at: float = Field(alias="createdAt")
    dangling: bool = False
    containers: int = 0

    model_config = {"populate_by_name": True}


class BuildRequest(BaseModel):
    tag: str = Field(min_length=1, max_length=200)
    dockerfile: str = Field(min_length=1)
    # Дополнительные файлы контекста: путь -> содержимое (для COPY в Dockerfile).
    files: dict[str, str] = {}
    build_args: dict[str, str] = Field(default_factory=dict, alias="buildArgs")
    no_cache: bool = Field(False, alias="noCache")
    pull: bool = False

    model_config = {"populate_by_name": True}


class PullRequest(BaseModel):
    repository: str = Field(min_length=1)
    tag: str = "latest"


class JobRef(BaseModel):
    id: str
    kind: Literal["build", "pull"]


class JobEvent(BaseModel):
    ts: float
    text: str
    stream: LogStream = "stdout"


class JobStatus(BaseModel):
    id: str
    kind: Literal["build", "pull"]
    state: Literal["running", "success", "error"]
    started_at: float = Field(alias="startedAt")
    finished_at: float | None = Field(None, alias="finishedAt")
    error: str | None = None
    events: list[JobEvent] = []

    model_config = {"populate_by_name": True}
