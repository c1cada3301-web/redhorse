from __future__ import annotations

import logging
import secrets
import time
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, Response, WebSocket, WebSocketException, status
from starlette.requests import HTTPConnection
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from database.models import RevokedToken, Setting, User
from database.session import get_session, sessionmaker

log = logging.getLogger(__name__)

ALGORITHM = "HS256"
_SECRET_KEY = "jwt_secret"

# Секрет держим в модуле, но берём его из базы: сгенерированный на процесс
# разлогинивал всех при каждом перезапуске API.
_secret: str | None = None


def secret() -> str:
    if _secret is None:
        # Сюда попадаем, только если ensure_secret ещё не отработал — например
        # запрос пришёл до конца старта. Молча подписывать нечем.
        raise RuntimeError("Секрет подписи токенов ещё не загружен")

    return _secret


async def ensure_secret() -> None:
    """
    Берёт секрет из окружения, а если его нет — из базы; когда нет и там,
    генерирует и сохраняет. Так он переживает перезапуск сам, без ручной
    настройки, и остаётся один на все реплики, которые смотрят в одну базу.
    """
    global _secret

    configured = get_settings().jwt_secret.strip()

    if configured:
        _secret = configured
        return

    async with sessionmaker()() as session:
        stored = await session.get(Setting, _SECRET_KEY)

        if stored is not None:
            _secret = stored.value
            return

        generated = secrets.token_urlsafe(48)
        session.add(Setting(key=_SECRET_KEY, value=generated))

        try:
            await session.commit()
        except IntegrityError:
            # Гонка двух воркеров на первом старте: побеждает тот, кто успел,
            # второй просто перечитывает записанное.
            await session.rollback()
            existing = await session.get(Setting, _SECRET_KEY)
            generated = existing.value if existing is not None else generated

        _secret = generated
        log.info("Секрет подписи токенов создан и сохранён в базе")


# --- пароли ----------------------------------------------------------------


def hash_password(password: str) -> str:
    # bcrypt читает только первые 72 байта пароля, остальное молча отбрасывает.
    return bcrypt.hashpw(password.encode()[:72], bcrypt.gensalt()).decode()


# Хеш-пустышка: вход с несуществующим логином тратит на bcrypt столько же
# времени, сколько с существующим, и по задержке логины не перебрать.
_DUMMY_HASH = bcrypt.hashpw(secrets.token_bytes(16), bcrypt.gensalt()).decode()


def burn_password_check(password: str) -> None:
    verify_password(password, _DUMMY_HASH)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode()[:72], password_hash.encode())
    except ValueError:
        # Битый хеш в базе не должен ронять вход — это просто неуспешная проверка.
        return False


# --- токены ----------------------------------------------------------------


@dataclass(frozen=True)
class TokenClaims:
    user_id: int
    jti: str
    expires_at: datetime


def create_token(user: User) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(user.id),
        "name": user.username,
        # Идентификатор сессии: по нему выход отзывает именно этот токен.
        "jti": secrets.token_urlsafe(16),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=settings.jwt_ttl_hours)).timestamp()),
    }
    return jwt.encode(payload, secret(), algorithm=ALGORITHM)


def set_session_cookie(request: Request, response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        settings.session_cookie,
        token,
        max_age=settings.jwt_ttl_hours * 3600,
        httponly=True,           # JS до токена не дотянется — XSS его не украдёт
        # strict, а не lax: «своим сайтом» браузер считает любой порт того же
        # хоста, а там крутятся чужие контейнеры с веб-интерфейсами.
        samesite="strict",
        # По HTTPS — всегда Secure. По голому HTTP браузер такую cookie не сохранит.
        secure=settings.cookie_secure or request.url.scheme == "https",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(get_settings().session_cookie, path="/")


def decode_token(token: str) -> TokenClaims | None:
    try:
        payload = jwt.decode(
            token,
            secret(),
            algorithms=[ALGORITHM],
            options={"require": ["sub", "jti", "exp"]},
        )
        return TokenClaims(
            user_id=int(payload["sub"]),
            jti=str(payload["jti"]),
            expires_at=datetime.fromtimestamp(int(payload["exp"]), tz=UTC),
        )
    except (jwt.InvalidTokenError, TypeError, ValueError):
        return None


async def revoke_token(session: AsyncSession, claims: TokenClaims) -> None:
    """Записывает сессию в отозванные и попутно чистит те, что истекли сами."""
    now = datetime.now(UTC)
    await session.execute(delete(RevokedToken).where(RevokedToken.expires_at < now))

    if await session.get(RevokedToken, claims.jti) is None:
        session.add(RevokedToken(jti=claims.jti, expires_at=claims.expires_at))

    await session.commit()


async def is_revoked(session: AsyncSession, jti: str) -> bool:
    return await session.get(RevokedToken, jti) is not None


# --- зависимости -----------------------------------------------------------


async def _load_active_user(session: AsyncSession, user_id: int) -> User | None:
    user = await session.get(User, user_id)
    return user if user is not None and user.is_active else None


async def current_user(
    connection: HTTPConnection,
    session: AsyncSession = Depends(get_session),
) -> User:
    """
    Единственная проверка входа — общая для HTTP и WebSocket.

    HTTPConnection — общий предок Request и WebSocket, поэтому одну и ту же
    зависимость можно повесить на весь роутер: стримы логов и статистики
    закрываются так же, как обычные запросы, а не остаются щелью в обход входа.
    """
    token = connection.cookies.get(get_settings().session_cookie)
    user = None

    if token:
        claims = decode_token(token)
        if claims is not None and not await is_revoked(session, claims.jti):
            user = await _load_active_user(session, claims.user_id)

    if user is None:
        if isinstance(connection, WebSocket):
            # Для сокета HTTP-статуса нет: закрываем с policy violation.
            raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Требуется вход")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Требуется вход")

    return user


# --- первичная настройка ---------------------------------------------------

_started_at = time.monotonic()


def mark_started() -> None:
    """Отсчёт окна первичной настройки — от старта процесса."""
    global _started_at
    _started_at = time.monotonic()


def setup_window_open() -> bool:
    minutes = get_settings().setup_window_minutes
    return minutes <= 0 or time.monotonic() - _started_at < minutes * 60


async def users_exist(session: AsyncSession) -> bool:
    total = await session.scalar(select(func.count()).select_from(User))
    return bool(total)


async def get_by_username(session: AsyncSession, username: str) -> User | None:
    return await session.scalar(select(User).where(User.username == username))


async def create_user(session: AsyncSession, username: str, password: str, *, is_admin: bool = True) -> User:
    user = User(username=username, password_hash=hash_password(password), is_admin=is_admin)
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def ensure_admin() -> None:
    """
    Заводит администратора из переменных окружения — но только если пароль задан
    явно. Без пароля база остаётся пустой, и первого админа создаёт UI, как это
    делает Portainer при первом заходе.
    """
    settings = get_settings()
    if not settings.admin_user or not settings.admin_password:
        return

    async with sessionmaker()() as session:
        if await users_exist(session):
            return
        await create_user(session, settings.admin_user, settings.admin_password)
        log.info("Создан администратор %s из переменных окружения", settings.admin_user)
