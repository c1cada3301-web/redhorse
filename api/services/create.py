from __future__ import annotations

import shlex

from schemas import CreateContainerRequest

# Мегабайты в байты: Docker принимает лимиты памяти только в байтах.
_MB = 1024 * 1024
# Доли ядра Docker хранит в наноединицах: 1 ядро — это 1e9.
_NANO_CPUS = 1_000_000_000


def split_command(value: str) -> list[str] | None:
    """
    Разбирает строку команды по правилам оболочки, чтобы кавычки работали
    так же, как в `docker run`. Пустая строка означает «оставить из образа».
    """
    trimmed = value.strip()
    if trimmed == "":
        return None
    return shlex.split(trimmed)


def build_ports(request: CreateContainerRequest) -> dict[str, object] | None:
    """
    Публикация портов в формате docker-py: ключ — порт контейнера с протоколом,
    значение — порт хоста, пара (адрес, порт) или None для случайного порта.
    """
    if not request.ports:
        return None

    mapping: dict[str, object] = {}

    for binding in request.ports:
        key = f"{binding.container_port}/{binding.protocol}"
        host_ip = binding.host_ip.strip()

        if binding.host_port is None:
            # Порт не задан — Docker выберет свободный сам.
            mapping[key] = (host_ip, None) if host_ip else None
        elif host_ip:
            mapping[key] = (host_ip, binding.host_port)
        else:
            mapping[key] = binding.host_port

    return mapping


def build_volumes(request: CreateContainerRequest) -> dict[str, dict[str, str]] | None:
    """Монтирования в формате docker-py: источник → точка и режим."""
    if not request.volumes:
        return None

    return {
        binding.source.strip(): {
            "bind": binding.target.strip(),
            "mode": "ro" if binding.read_only else "rw",
        }
        for binding in request.volumes
    }


def build_restart_policy(request: CreateContainerRequest) -> dict[str, object] | None:
    policy = request.restart_policy

    if policy.name == "no":
        return None

    result: dict[str, object] = {"Name": policy.name}

    # Ограничение попыток Docker принимает только для on-failure.
    if policy.name == "on-failure" and policy.maximum_retry > 0:
        result["MaximumRetryCount"] = policy.maximum_retry

    return result


def build_devices(request: CreateContainerRequest) -> list[str] | None:
    """
    Устройства в формате docker run --device: путь хоста, путь внутри и права.
    Пустой путь внутри означает «та же точка, что на хосте».
    """
    if not request.devices:
        return None

    result: list[str] = []

    for device in request.devices:
        host = device.host_path.strip()
        target = device.container_path.strip() or host
        result.append(f"{host}:{target}:{device.permissions}")

    return result


def build_log_config(request: CreateContainerRequest) -> dict[str, object] | None:
    """Драйвер логирования. Без драйвера настройки бессмысленны, поэтому и опции опускаем."""
    driver = request.log_config.driver.strip()

    if driver == "":
        return None

    config: dict[str, object] = {"Type": driver}

    if request.log_config.options:
        config["Config"] = request.log_config.options

    return config


def build_kwargs(request: CreateContainerRequest) -> dict[str, object]:
    """Собирает аргументы для docker-py, опуская всё, что не задано."""
    kwargs: dict[str, object] = {
        "image": request.image.strip(),
        "detach": True,
        "tty": request.tty,
        "stdin_open": request.stdin_open,
        "privileged": request.privileged,
    }

    optional: dict[str, object | None] = {
        "name": request.name.strip() or None,
        "command": split_command(request.command),
        "entrypoint": split_command(request.entrypoint),
        "working_dir": request.working_dir.strip() or None,
        "user": request.user.strip() or None,
        "hostname": request.hostname.strip() or None,
        "environment": request.env or None,
        "labels": request.labels or None,
        "network": request.network.strip() or None,
        "ports": build_ports(request),
        "volumes": build_volumes(request),
        "restart_policy": build_restart_policy(request),
        "cap_add": request.cap_add or None,
        "cap_drop": request.cap_drop or None,
        "mem_limit": request.memory_mb * _MB if request.memory_mb > 0 else None,
        "mem_reservation": (
            request.memory_reservation_mb * _MB if request.memory_reservation_mb > 0 else None
        ),
        "nano_cpus": int(request.cpus * _NANO_CPUS) if request.cpus > 0 else None,
        "init": True if request.init else None,
        "publish_all_ports": True if request.publish_all else None,
        "auto_remove": True if request.auto_remove else None,
        "domainname": request.domainname.strip() or None,
        "dns": [item.strip() for item in request.dns if item.strip() != ""] or None,
        "extra_hosts": request.extra_hosts or None,
        "devices": build_devices(request),
        "sysctls": request.sysctls or None,
        "shm_size": request.shm_size_mb * _MB if request.shm_size_mb > 0 else None,
        "runtime": request.runtime.strip() or None,
        "log_config": build_log_config(request),
    }

    kwargs.update({key: value for key, value in optional.items() if value is not None})

    return kwargs
