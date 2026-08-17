"""Преобразование сырых структур Docker Engine в схемы Redhorse."""

from __future__ import annotations

from datetime import datetime

from schemas import (
    Container,
    ContainerDetails,
    ContainerStats,
    EnvVar,
    Image,
    MountPoint,
    NetworkAttachment,
    ResourceLimits,
)

_STATE_FALLBACK = "created"
_KNOWN_STATES = {"running", "exited", "paused", "restarting", "created", "dead", "removing"}


def parse_docker_time(value: str | None) -> float | None:
    """Docker отдаёт RFC3339 с наносекундами — Python понимает только микросекунды."""
    if value is None or value.startswith("0001-01-01"):
        return None

    cleaned = value.replace("Z", "+00:00")

    if "." in cleaned:
        head, _, tail = cleaned.partition(".")
        fraction, sign, offset = _split_offset(tail)
        cleaned = f"{head}.{fraction[:6]:0<6}{sign}{offset}"

    try:
        return datetime.fromisoformat(cleaned).timestamp() * 1000
    except ValueError:
        return None


def _split_offset(tail: str) -> tuple[str, str, str]:
    for sign in ("+", "-"):
        if sign in tail:
            fraction, _, offset = tail.partition(sign)
            return fraction, sign, offset
    return tail, "", ""


def format_ports(attrs: dict) -> list[str]:
    ports = (attrs.get("NetworkSettings") or {}).get("Ports") or {}
    result: list[str] = []

    for internal, bindings in sorted(ports.items()):
        if not bindings:
            result.append(internal)
            continue
        for binding in bindings:
            host_ip = binding.get("HostIp") or "0.0.0.0"
            result.append(f"{host_ip}:{binding.get('HostPort')}->{internal}")

    return result


def to_container(raw) -> Container:
    attrs = raw.attrs
    state = attrs.get("State") or {}
    config = attrs.get("Config") or {}
    labels = config.get("Labels") or {}
    networks = list(((attrs.get("NetworkSettings") or {}).get("Networks") or {}).keys())

    status = state.get("Status") or _STATE_FALLBACK
    health = ((state.get("Health") or {}).get("Status") or "none").lower()
    command = " ".join(config.get("Cmd") or []) or (config.get("Entrypoint") and " ".join(config["Entrypoint"])) or ""

    return Container(
        id=raw.id,
        name=raw.name,
        image=_image_name(raw, attrs),
        state=status if status in _KNOWN_STATES else _STATE_FALLBACK,
        status=raw.status,
        createdAt=parse_docker_time(attrs.get("Created")) or 0.0,
        startedAt=parse_docker_time(state.get("StartedAt")) if status == "running" else None,
        ports=format_ports(attrs),
        networks=networks,
        sizeRw=int(attrs.get("SizeRw") or 0),
        sizeRootFs=int(attrs.get("SizeRootFs") or 0),
        health=health if health in {"healthy", "unhealthy", "starting"} else "none",
        restarts=int(state.get("RestartCount") or 0),
        stack=labels.get("com.docker.compose.project"),
        command=command,
    )


def to_details(raw) -> ContainerDetails:
    """Полный инспект для детальной страницы."""
    attrs = raw.attrs
    config = attrs.get("Config") or {}
    host = attrs.get("HostConfig") or {}
    state = attrs.get("State") or {}
    policy = host.get("RestartPolicy") or {}
    networks = (attrs.get("NetworkSettings") or {}).get("Networks") or {}

    base = to_container(raw)

    return ContainerDetails(
        **base.model_dump(by_alias=True),
        entrypoint=list(config.get("Entrypoint") or []),
        workingDir=config.get("WorkingDir") or "",
        user=config.get("User") or "",
        platform=attrs.get("Platform") or "",
        driver=attrs.get("Driver") or "",
        logPath=attrs.get("LogPath") or "",
        env=[_split_env(item) for item in (config.get("Env") or [])],
        mounts=[_to_mount(item) for item in (attrs.get("Mounts") or [])],
        labels=config.get("Labels") or {},
        networkDetails=[_to_attachment(name, data) for name, data in networks.items()],
        restartPolicy=policy.get("Name") or "no",
        restartPolicyRetries=int(policy.get("MaximumRetryCount") or 0),
        limits=ResourceLimits(
            memory=int(host.get("Memory") or 0),
            nanoCpus=int(host.get("NanoCpus") or 0),
            cpuShares=int(host.get("CpuShares") or 0),
        ),
        privileged=bool(host.get("Privileged")),
        exitCode=int(state.get("ExitCode") or 0),
        error=state.get("Error") or "",
        oomKilled=bool(state.get("OOMKilled")),
        pid=int(state.get("Pid") or 0),
        finishedAt=parse_docker_time(state.get("FinishedAt")),
        healthLog=[
            str(entry.get("Output") or "").strip()
            for entry in ((state.get("Health") or {}).get("Log") or [])
        ][-5:],
    )


def _split_env(item: str) -> EnvVar:
    key, _, value = item.partition("=")
    return EnvVar(key=key, value=value)


def _to_mount(item: dict) -> MountPoint:
    return MountPoint(
        type=item.get("Type") or "",
        # У анонимных томов источник — имя тома, у bind — путь на хосте.
        source=item.get("Source") or item.get("Name") or "",
        destination=item.get("Destination") or "",
        mode=item.get("Mode") or "",
        rw=bool(item.get("RW", True)),
    )


def _to_attachment(name: str, data: dict) -> NetworkAttachment:
    return NetworkAttachment(
        name=name,
        ipAddress=data.get("IPAddress") or "",
        gateway=data.get("Gateway") or "",
        macAddress=data.get("MacAddress") or "",
        aliases=[alias for alias in (data.get("Aliases") or []) if alias],
    )


def _image_name(raw, attrs: dict) -> str:
    """Тег образа. `raw.image` дёргает Engine и падает, если образ уже удалён."""
    configured = (attrs.get("Config") or {}).get("Image")
    if configured:
        return configured

    try:
        tags = raw.image.tags if raw.image is not None else []
        return tags[0] if tags else raw.image.short_id
    except Exception:
        return attrs.get("Image") or "<none>"


def to_image(raw, usage: dict[str, int] | None = None) -> Image:
    attrs = raw.attrs
    tags = raw.tags or []

    return Image(
        id=raw.id,
        tags=tags,
        size=int(attrs.get("Size") or 0),
        createdAt=parse_docker_time(attrs.get("Created")) or 0.0,
        dangling=len(tags) == 0,
        containers=(usage or {}).get(raw.id, 0),
    )


def to_stats(sample: dict, previous: dict | None = None) -> ContainerStats:
    """Считает CPU/сеть/диск из сырого ответа /containers/{id}/stats."""
    return ContainerStats(
        cpu=_cpu_percent(sample),
        mem=_mem_usage(sample),
        memLimit=int(((sample.get("memory_stats") or {}).get("limit")) or 0),
        netRx=_sum_net(sample, "rx_bytes"),
        netTx=_sum_net(sample, "tx_bytes"),
        blkRead=_sum_blk(sample, "read"),
        blkWrite=_sum_blk(sample, "write"),
    )


def _cpu_percent(sample: dict) -> float:
    cpu = sample.get("cpu_stats") or {}
    pre = sample.get("precpu_stats") or {}

    cpu_delta = (cpu.get("cpu_usage") or {}).get("total_usage", 0) - (pre.get("cpu_usage") or {}).get("total_usage", 0)
    system_delta = cpu.get("system_cpu_usage", 0) - pre.get("system_cpu_usage", 0)

    if cpu_delta <= 0 or system_delta <= 0:
        return 0.0

    cores = cpu.get("online_cpus") or len((cpu.get("cpu_usage") or {}).get("percpu_usage") or []) or 1
    return round(cpu_delta / system_delta * cores * 100, 2)


def _mem_usage(sample: dict) -> int:
    """Повторяет calculateMemUsageUnixNoCache из docker CLI.

    Ключ кеша разный: cgroup v1 отдаёт total_inactive_file, v2 — inactive_file.
    И вычитать кеш можно только если он меньше usage, иначе на части хостов
    память показывалась бы нулём.
    """
    memory = sample.get("memory_stats") or {}
    usage = int(memory.get("usage") or 0)
    stats = memory.get("stats") or {}

    cache = stats.get("total_inactive_file")
    if cache is None:
        cache = stats.get("inactive_file")

    cache = int(cache or 0)

    return usage - cache if 0 < cache < usage else usage


def _sum_net(sample: dict, key: str) -> float:
    networks = sample.get("networks") or {}
    return float(sum(iface.get(key, 0) for iface in networks.values()))


def _sum_blk(sample: dict, op: str) -> float:
    entries = ((sample.get("blkio_stats") or {}).get("io_service_bytes_recursive")) or []
    return float(sum(e.get("value", 0) for e in entries if str(e.get("op", "")).lower() == op))
