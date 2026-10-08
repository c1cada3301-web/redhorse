"""
ASGI-прослойки безопасности: проверка Origin и защитные заголовки.

Раньше заголовки ставил отдельный nginx. В установке одним контейнером его
нет, поэтому то же самое делает сам API.
"""

from __future__ import annotations

import json
from collections.abc import Iterable
from urllib.parse import urlsplit

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

# Запросы, которые ничего не меняют: их Origin не проверяем.
_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

# Swagger в разработке грузит скрипты с CDN — строгий CSP его бы сломал.
_DOCS_PREFIXES = ("/docs", "/redoc", "/openapi.json")

_CSP = "; ".join(
    (
        "default-src 'self'",
        "script-src 'self'",
        # Radix и анимации ставят стили инлайном — без unsafe-inline интерфейс разваливается.
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
    )
)

_HEADERS = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "cross-origin-opener-policy": "same-origin",
}


def _netloc(origin: str) -> str | None:
    parts = urlsplit(origin)
    if parts.scheme not in {"http", "https"} or not parts.netloc:
        return None
    return parts.netloc.lower()


def origin_allowed(origin: str | None, hosts: Iterable[str], trusted: Iterable[str]) -> bool:
    """
    Пускает запрос, если он пришёл со страницы самой панели.

    Нет Origin — значит клиент не браузер (curl, скрипт): у него нет чужой
    cookie, и CSRF ему не нужен. Браузер Origin ставит всегда, и на POST,
    и на открытие вебсокета.
    """
    if origin is None:
        return True

    if origin.rstrip("/") in {item.rstrip("/") for item in trusted}:
        return True

    netloc = _netloc(origin)
    if netloc is None:
        # Origin: null — песочница или file://, своим считать нельзя.
        return False

    return netloc in {host.lower() for host in hosts if host}


class OriginGuard:
    """
    Отклоняет изменяющие запросы и вебсокеты с чужих страниц.

    SameSite у cookie от этого не спасает полностью: соседний порт того же
    хоста браузер считает «тем же сайтом», а на хосте панели крутятся чужие
    контейнеры. Простой POST без тела (kill, prune) прошёл бы без preflight.
    """

    def __init__(self, app: ASGIApp, trusted_origins: Iterable[str] = ()) -> None:
        self.app = app
        self.trusted = tuple(trusted_origins)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        kind = scope["type"]

        if kind not in {"http", "websocket"} or (kind == "http" and scope["method"] in _SAFE_METHODS):
            await self.app(scope, receive, send)
            return

        headers = Headers(scope=scope)
        # X-Forwarded-Host подделать со страницы нельзя: свой заголовок в простом
        # запросе вызывает preflight, а вебсокету браузер их не даёт вовсе.
        hosts = (headers.get("host", ""), headers.get("x-forwarded-host", ""))

        if origin_allowed(headers.get("origin"), hosts, self.trusted):
            await self.app(scope, receive, send)
            return

        if kind == "websocket":
            # До accept закрытие превращается в HTTP 403 на рукопожатии.
            await receive()
            await send({"type": "websocket.close", "code": 1008, "reason": "Чужой Origin"})
            return

        body = json.dumps({"detail": "Запрос с чужой страницы отклонён"}, ensure_ascii=False).encode()
        await send(
            {
                "type": "http.response.start",
                "status": 403,
                "headers": [
                    (b"content-type", b"application/json; charset=utf-8"),
                    (b"content-length", str(len(body)).encode()),
                ],
            }
        )
        await send({"type": "http.response.body", "body": body})


class SecurityHeaders:
    """Защитные заголовки на каждый HTTP-ответ: clickjacking, sniffing, CSP."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        with_csp = not scope["path"].startswith(_DOCS_PREFIXES)

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                for name, value in _HEADERS.items():
                    headers.setdefault(name, value)
                if with_csp:
                    headers.setdefault("content-security-policy", _CSP)
            await send(message)

        await self.app(scope, receive, send_with_headers)
