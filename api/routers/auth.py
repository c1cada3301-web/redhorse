from __future__ import annotations

import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from auth import (
    burn_password_check,
    clear_session_cookie,
    create_token,
    create_user,
    current_user,
    decode_token,
    get_by_username,
    revoke_token,
    set_session_cookie,
    setup_window_open,
    users_exist,
    verify_password,
)
from config import get_settings
from database.models import User
from database.session import get_session

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Простая защита от подбора: пять неудач с одного адреса — пауза на минуту.
# Память процесса, не Redis: панель обычно живёт в одном экземпляре.
MAX_ATTEMPTS = 5
LOCKOUT_SECONDS = 60
# Потолок числа отслеживаемых адресов: перебор с тысяч IP не должен раздувать память.
MAX_TRACKED_IPS = 10_000
_attempts: dict[str, list[float]] = defaultdict(list)


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _forget_stale(now: float) -> None:
    for ip in [ip for ip, stamps in _attempts.items() if not stamps or now - stamps[-1] >= LOCKOUT_SECONDS]:
        del _attempts[ip]


def _record_failure(ip: str) -> None:
    now = time.monotonic()
    if len(_attempts) >= MAX_TRACKED_IPS:
        _forget_stale(now)
    _attempts[ip].append(now)


def _check_rate_limit(ip: str) -> None:
    if ip not in _attempts:
        return

    now = time.monotonic()
    recent = [stamp for stamp in _attempts[ip] if now - stamp < LOCKOUT_SECONDS]
    if not recent:
        del _attempts[ip]
        return
    _attempts[ip] = recent
    if len(recent) >= MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Слишком много попыток входа. Подожди минуту.",
        )


class Credentials(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)

    @field_validator("username")
    @classmethod
    def strip_username(cls, value: str) -> str:
        return value.strip()


class NewAccount(Credentials):
    password: str = Field(min_length=8, max_length=256)


class AuthState(BaseModel):
    """Есть ли в базе хоть один пользователь — от этого зависит первый экран."""

    initialized: bool
    # Можно ли ещё создать первого администратора: окно настройки ограничено.
    setup_open: bool = Field(alias="setupOpen")

    model_config = {"populate_by_name": True}


class Account(BaseModel):
    username: str
    is_admin: bool = Field(alias="isAdmin")

    model_config = {"populate_by_name": True}


def _account(user: User) -> Account:
    return Account(username=user.username, isAdmin=user.is_admin)


@router.get("/state", response_model=AuthState)
async def state(session: AsyncSession = Depends(get_session)) -> AuthState:
    return AuthState(initialized=await users_exist(session), setupOpen=setup_window_open())


@router.post("/bootstrap", response_model=Account, status_code=201)
async def bootstrap(
    payload: NewAccount,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> Account:
    """
    Первый администратор. Доступно, только пока в базе нет ни одного
    пользователя и не истекло окно настройки после старта.
    """
    if await users_exist(session):
        raise HTTPException(status_code=409, detail="Администратор уже создан")

    if not setup_window_open():
        minutes = get_settings().setup_window_minutes
        raise HTTPException(
            status_code=403,
            detail=(
                f"Время на создание администратора ({minutes} мин после старта) вышло. "
                "Перезапусти контейнер панели и создай его сразу."
            ),
        )

    user = await create_user(session, payload.username, payload.password)
    set_session_cookie(request, response, create_token(user))
    return _account(user)


@router.post("/login", response_model=Account)
async def login(
    payload: Credentials,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> Account:
    ip = _client_ip(request)
    _check_rate_limit(ip)

    user = await get_by_username(session, payload.username)

    # Одинаковый ответ и одинаковое время на «нет такого пользователя» и
    # «неверный пароль»: иначе по ответу или задержке перебираются логины.
    if user is None:
        burn_password_check(payload.password)
        valid = False
    else:
        valid = verify_password(payload.password, user.password_hash) and user.is_active

    if not valid:
        _record_failure(ip)
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")

    _attempts.pop(ip, None)
    set_session_cookie(request, response, create_token(user))
    return _account(user)


@router.post("/logout", status_code=204)
async def logout(request: Request, response: Response, session: AsyncSession = Depends(get_session)) -> None:
    """Отзывает текущую сессию: украденная копия cookie после выхода не сработает."""
    token = request.cookies.get(get_settings().session_cookie)
    claims = decode_token(token) if token else None

    if claims is not None:
        await revoke_token(session, claims)

    clear_session_cookie(response)


@router.get("/me", response_model=Account)
async def me(user: User = Depends(current_user)) -> Account:
    return _account(user)
