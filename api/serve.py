"""
Точка входа образа: HTTP и HTTPS из одного процесса, как 9000 и 9443 у Portainer.

HTTPS поднимается с самоподписанным сертификатом, созданным при первом старте
и сохранённым в томе. Свой сертификат — через DALA_TLS_CERT и DALA_TLS_KEY.
"""

from __future__ import annotations

import asyncio
import logging
import os
import socket
from datetime import UTC, datetime, timedelta
from pathlib import Path

import uvicorn
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID

from config import Settings, get_settings

log = logging.getLogger("dala.serve")

_CERT_DAYS = 3650


def self_signed(directory: Path) -> tuple[Path, Path]:
    """Возвращает пару сертификат/ключ из каталога, создавая её при первом вызове."""
    cert_path = directory / "cert.pem"
    key_path = directory / "key.pem"

    if cert_path.is_file() and key_path.is_file():
        return cert_path, key_path

    directory.mkdir(parents=True, exist_ok=True)
    key = ec.generate_private_key(ec.SECP256R1())
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "dala")])
    now = datetime.now(UTC)

    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=5))
        .not_valid_after(now + timedelta(days=_CERT_DAYS))
        .add_extension(
            x509.SubjectAlternativeName([x509.DNSName("localhost"), x509.DNSName(socket.gethostname())]),
            critical=False,
        )
        .sign(key, hashes.SHA256())
    )

    # Ключ пишем сразу с правами 600: между созданием и chmod его не прочитать.
    fd = os.open(key_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "wb") as handle:
        handle.write(
            key.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.PKCS8,
                serialization.NoEncryption(),
            )
        )
    cert_path.write_bytes(cert.public_bytes(serialization.Encoding.PEM))

    log.info("Создан самоподписанный сертификат: %s", cert_path)
    return cert_path, key_path


def tls_files(settings: Settings) -> tuple[str, str]:
    if settings.tls_cert and settings.tls_key:
        return settings.tls_cert, settings.tls_key

    cert, key = self_signed(Path(settings.data_dir) / "certs")
    return str(cert), str(key)


def build_servers(settings: Settings) -> list[uvicorn.Server]:
    common = {
        "host": "0.0.0.0",
        "proxy_headers": True,
        "forwarded_allow_ips": settings.forwarded_allow_ips,
        "server_header": False,
    }
    servers = [uvicorn.Server(uvicorn.Config("app:app", port=settings.http_port, **common))]

    if settings.https_port > 0:
        cert, key = tls_files(settings)
        # lifespan выполняет первый сервер — второй делит с ним то же приложение.
        servers.append(
            uvicorn.Server(
                uvicorn.Config(
                    "app:app",
                    port=settings.https_port,
                    ssl_certfile=cert,
                    ssl_keyfile=key,
                    lifespan="off",
                    **common,
                )
            )
        )

    return servers


async def main() -> None:
    servers = build_servers(get_settings())
    primary, *rest = servers
    tasks = [asyncio.create_task(primary.serve())]

    # Остальные стартуют, когда первый прошёл lifespan: до этого секрета
    # подписи ещё нет, и запрос на HTTPS-порт упал бы с ошибкой.
    while not primary.started and not tasks[0].done():
        await asyncio.sleep(0.05)

    tasks += [asyncio.create_task(server.serve()) for server in rest]

    # Упал или остановился один — гасим и второй, иначе контейнер жив наполовину.
    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
    for server in servers:
        server.should_exit = True
    await asyncio.gather(*pending, return_exceptions=True)

    for task in done:
        task.result()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
    asyncio.run(main())
