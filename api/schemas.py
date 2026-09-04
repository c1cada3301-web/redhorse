from __future__ import annotations

import re

from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

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


# Способы задать контекст сборки — те же три, что в Portainer.
BuildSource = Literal["editor", "url"]


class BuildRequest(BaseModel):
    tag: str = Field(min_length=1, max_length=200)
    # Дополнительные теги: Docker при сборке принимает один, остальные вешаем следом.
    extra_tags: list[str] = Field(default_factory=list, max_length=8, alias="extraTags")
    source: BuildSource = "editor"

    # source=editor: Dockerfile и файлы контекста приходят текстом.
    dockerfile: str = Field("", max_length=MAX_DOCKERFILE_CHARS)
    # Дополнительные файлы контекста: путь -> содержимое (для COPY в Dockerfile).
    files: dict[str, str] = Field(default_factory=dict, max_length=MAX_CONTEXT_FILES)
    # source=url: адрес git-репозитория или tar-архива, контекст качает сам демон.
    context_url: str = Field("", max_length=2000, alias="contextUrl")
    # Путь к Dockerfile внутри контекста — нужен, когда он лежит не в корне.
    dockerfile_path: str = Field("", max_length=400, alias="dockerfilePath")

    build_args: dict[str, str] = Field(default_factory=dict, alias="buildArgs")
    no_cache: bool = Field(False, alias="noCache")
    pull: bool = False

    model_config = {"populate_by_name": True}

    @model_validator(mode="after")
    def _check_source(self) -> "BuildRequest":
        if self.source == "editor" and self.dockerfile.strip() == "":
            raise ValueError("Для сборки из редактора нужен Dockerfile")

        if self.source == "url":
            if self.context_url.strip() == "":
                raise ValueError("Укажите адрес репозитория или архива")
            if not self.context_url.startswith(("http://", "https://", "git://", "git@")):
                raise ValueError("Поддерживаются только адреса http, https и git")

        return self

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


# --- создание контейнера ----------------------------------------------------

RestartPolicyName = Literal["no", "always", "on-failure", "unless-stopped"]


class PortBinding(BaseModel):
    """Публикация порта наружу. hostIp пуст — слушаем на всех адресах хоста."""

    container_port: int = Field(ge=1, le=65535, alias="containerPort")
    host_port: int | None = Field(None, ge=1, le=65535, alias="hostPort")
    protocol: Literal["tcp", "udp"] = "tcp"
    host_ip: str = Field("", max_length=64, alias="hostIp")

    model_config = {"populate_by_name": True}


class VolumeBinding(BaseModel):
    """Том или папка хоста внутри контейнера."""

    source: str = Field(min_length=1, max_length=1024)
    target: str = Field(min_length=1, max_length=1024)
    read_only: bool = Field(False, alias="readOnly")

    model_config = {"populate_by_name": True}

    @field_validator("target")
    @classmethod
    def _absolute_target(cls, value: str) -> str:
        if not value.startswith("/"):
            raise ValueError("Путь внутри контейнера должен быть абсолютным")
        return value


class RestartPolicy(BaseModel):
    name: RestartPolicyName = "no"
    # Имеет смысл только для on-failure: сколько раз пробовать.
    maximum_retry: int = Field(0, ge=0, le=100, alias="maximumRetry")

    model_config = {"populate_by_name": True}


class DeviceBinding(BaseModel):
    """Проброс устройства хоста внутрь контейнера."""

    host_path: str = Field(min_length=1, max_length=512, alias="hostPath")
    container_path: str = Field("", max_length=512, alias="containerPath")
    # rwm: чтение, запись, mknod — как в docker run --device.
    permissions: str = Field("rwm", max_length=3)

    model_config = {"populate_by_name": True}

    @field_validator("permissions")
    @classmethod
    def _valid_permissions(cls, value: str) -> str:
        if set(value) - set("rwm") or value == "":
            raise ValueError("Права устройства задаются буквами r, w и m")
        return value


class LogConfig(BaseModel):
    """Драйвер логирования контейнера. Пусто — тот, что настроен у демона."""

    driver: str = Field("", max_length=64)
    options: dict[str, str] = Field(default_factory=dict, max_length=32)

    model_config = {"populate_by_name": True}


class CreateContainerRequest(BaseModel):
    name: str = Field("", max_length=128)
    image: str = Field(min_length=1, max_length=400)
    # Скачать образ перед запуском, даже если локальная копия есть.
    always_pull: bool = Field(False, alias="alwaysPull")

    command: str = Field("", max_length=4000)
    entrypoint: str = Field("", max_length=4000)
    working_dir: str = Field("", max_length=1024, alias="workingDir")
    user: str = Field("", max_length=128)
    hostname: str = Field("", max_length=255)

    ports: list[PortBinding] = Field(default_factory=list, max_length=64)
    publish_all: bool = Field(False, alias="publishAll")
    volumes: list[VolumeBinding] = Field(default_factory=list, max_length=64)
    env: dict[str, str] = Field(default_factory=dict, max_length=200)
    labels: dict[str, str] = Field(default_factory=dict, max_length=100)

    network: str = Field("", max_length=128)
    domainname: str = Field("", max_length=255)
    dns: list[str] = Field(default_factory=list, max_length=8)
    # Записи в /etc/hosts контейнера: имя -> адрес.
    extra_hosts: dict[str, str] = Field(default_factory=dict, max_length=32, alias="extraHosts")

    restart_policy: RestartPolicy = Field(default_factory=RestartPolicy, alias="restartPolicy")

    # Ресурсы. 0 — без ограничения.
    memory_mb: int = Field(0, ge=0, le=1024 * 1024, alias="memoryMb")
    memory_reservation_mb: int = Field(0, ge=0, le=1024 * 1024, alias="memoryReservationMb")
    cpus: float = Field(0, ge=0, le=1024)

    privileged: bool = False
    init: bool = False
    tty: bool = False
    stdin_open: bool = Field(False, alias="stdinOpen")
    auto_remove: bool = Field(False, alias="autoRemove")
    cap_add: list[str] = Field(default_factory=list, max_length=40, alias="capAdd")
    cap_drop: list[str] = Field(default_factory=list, max_length=40, alias="capDrop")

    devices: list[DeviceBinding] = Field(default_factory=list, max_length=32)
    sysctls: dict[str, str] = Field(default_factory=dict, max_length=32)
    # Размер /dev/shm в мегабайтах. 0 — оставить умолчание Docker (64 МБ).
    shm_size_mb: int = Field(0, ge=0, le=64 * 1024, alias="shmSizeMb")
    runtime: str = Field("", max_length=64)
    log_config: LogConfig = Field(default_factory=LogConfig, alias="logConfig")

    # Запустить сразу после создания — как «Deploy the container» в Portainer.
    start: bool = True

    model_config = {"populate_by_name": True}

    @field_validator("name")
    @classmethod
    def _valid_name(cls, value: str) -> str:
        trimmed = value.strip()
        if trimmed == "":
            return trimmed
        if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_.-]*", trimmed):
            raise ValueError("Имя может содержать латиницу, цифры, точку, тире и подчёркивание")
        return trimmed


class HubImage(BaseModel):
    """Результат поиска по Docker Hub."""

    name: str
    description: str = ""
    stars: int = 0
    official: bool = False

    model_config = {"populate_by_name": True}
