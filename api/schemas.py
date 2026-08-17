from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

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


class EnvVar(BaseModel):
    key: str
    value: str


class MountPoint(BaseModel):
    type: str
    source: str
    destination: str
    mode: str = ""
    rw: bool = True


class NetworkAttachment(BaseModel):
    name: str
    ip_address: str = Field("", alias="ipAddress")
    gateway: str = ""
    mac_address: str = Field("", alias="macAddress")
    aliases: list[str] = []

    model_config = {"populate_by_name": True}


class ResourceLimits(BaseModel):
    memory: int = 0
    nano_cpus: int = Field(0, alias="nanoCpus")
    cpu_shares: int = Field(0, alias="cpuShares")

    model_config = {"populate_by_name": True}


class ContainerDetails(Container):
    """Полный инспект: то, что нужно на детальной странице."""

    entrypoint: list[str] = []
    working_dir: str = Field("", alias="workingDir")
    user: str = ""
    platform: str = ""
    driver: str = ""
    log_path: str = Field("", alias="logPath")
    env: list[EnvVar] = []
    mounts: list[MountPoint] = []
    labels: dict[str, str] = {}
    network_details: list[NetworkAttachment] = Field(default_factory=list, alias="networkDetails")
    restart_policy: str = Field("", alias="restartPolicy")
    restart_policy_retries: int = Field(0, alias="restartPolicyRetries")
    limits: ResourceLimits = Field(default_factory=ResourceLimits)
    privileged: bool = False
    exit_code: int = Field(0, alias="exitCode")
    error: str = ""
    oom_killed: bool = Field(False, alias="oomKilled")
    pid: int = 0
    finished_at: float | None = Field(None, alias="finishedAt")
    health_log: list[str] = Field(default_factory=list, alias="healthLog")

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


# Потолки на контекст сборки: без них один запрос с гигабайтным телом
# кладёт процесс API по памяти ещё до валидации.
MAX_DOCKERFILE_CHARS = 256 * 1024
MAX_CONTEXT_FILES = 64
MAX_CONTEXT_CHARS = 8 * 1024 * 1024


class BuildRequest(BaseModel):
    tag: str = Field(min_length=1, max_length=200)
    dockerfile: str = Field(min_length=1, max_length=MAX_DOCKERFILE_CHARS)
    # Дополнительные файлы контекста: путь -> содержимое (для COPY в Dockerfile).
    files: dict[str, str] = Field(default_factory=dict, max_length=MAX_CONTEXT_FILES)
    build_args: dict[str, str] = Field(default_factory=dict, alias="buildArgs")
    no_cache: bool = Field(False, alias="noCache")
    pull: bool = False

    model_config = {"populate_by_name": True}

    @field_validator("files")
    @classmethod
    def _limit_total_size(cls, value: dict[str, str]) -> dict[str, str]:
        total = sum(len(content) for content in value.values())

        if total > MAX_CONTEXT_CHARS:
            raise ValueError(
                f"Контекст сборки слишком большой: {total} символов, лимит {MAX_CONTEXT_CHARS}"
            )

        return value


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
