from __future__ import annotations

import logging
import secrets
from datetime import UTC, datetime, timedelta

import bcrypt
from fastapi import Depends, HTTPException, Response, WebSocket, WebSocketException, status
from starlette.requests import HTTPConnection
from jose import JWTError, jwt
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from database.models import User
from database.session import get_session, sessionmaker

log = logging.getLogger(__name__)

ALGORITHM = "HS256"

# Секрет держим в модуле: если в окружении пусто, генерируем один на процесс.
# Тогда токены живут до рестарта API — для дева нормально, для прода задаётся явно.
_secret: str | None = None


def secret() -> str:
    global _secret
    if _secret is None:
        configured = get_settings().jwt_secret
        if configured:
            _secret = configured
        else:
            _secret = secrets.token_urlsafe(48)
            log.warning(
                "DALA_JWT_SECRET не задан — сгенерирован временный. "
                "После рестарта API все сессии слетят."
            )
    return _secret


# --- пароли ----------------------------------------------------------------


def hash_password(password: str) -> str:
    # bcrypt читает только первые 72 байта пароля, остальное молча отбрасывает.
    return bcrypt.hashpw(password.encode()[:72], bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode()[:72], password_hash.encode())
    except ValueError:
        # Битый хеш в базе не должен ронять вход — это просто неуспешная проверка.
        return False


# --- токены ----------------------------------------------------------------


def create_token(user: User) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(user.id),
        "name": user.username,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=settings.jwt_ttl_hours)).timestamp()),
    }
    return jwt.encode(payload, secret(), algorithm=ALGORITHM)


def set_session_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        settings.session_cookie,
        token,
        max_age=settings.jwt_ttl_hours * 3600,
        httponly=True,           # JS до токена не дотянется — XSS его не украдёт
        samesite="lax",          # защита от межсайтовых POST-запросов
        secure=settings.cookie_secure,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(get_settings().session_cookie, path="/")


def _user_id_from_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, secret(), algorithms=[ALGORITHM])
    except JWTError:
        return None
    try:
        return int(payload.get("sub", ""))
    except (TypeError, ValueError):
        return None


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
        user_id = _user_id_from_token(token)
        if user_id is not None:
            user = await _load_active_user(session, user_id)

    if user is None:
        if isinstance(connection, WebSocket):
            # Для сокета HTTP-статуса нет: закрываем с policy violation.
            raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Требуется вход")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Требуется вход")

    return user


# --- первичная настройка ---------------------------------------------------


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
