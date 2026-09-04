from __future__ import annotations

import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from auth import (
    clear_session_cookie,
    create_token,
    create_user,
    current_user,
    get_by_username,
    set_session_cookie,
    users_exist,
    verify_password,
)
from database.models import User
from database.session import get_session

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Простая защита от подбора: пять неудач с одного адреса — пауза на минуту.
# Память процесса, не Redis: панель обычно живёт в одном экземпляре.
MAX_ATTEMPTS = 5
LOCKOUT_SECONDS = 60
_attempts: dict[str, list[float]] = defaultdict(list)


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _check_rate_limit(ip: str) -> None:
    now = time.monotonic()
    recent = [stamp for stamp in _attempts[ip] if now - stamp < LOCKOUT_SECONDS]
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


class Account(BaseModel):
    username: str
    is_admin: bool = Field(alias="isAdmin")

    model_config = {"populate_by_name": True}


def _account(user: User) -> Account:
    return Account(username=user.username, isAdmin=user.is_admin)


@router.get("/state", response_model=AuthState)
async def state(session: AsyncSession = Depends(get_session)) -> AuthState:
    return AuthState(initialized=await users_exist(session))


@router.post("/bootstrap", response_model=Account, status_code=201)
async def bootstrap(
    payload: NewAccount,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> Account:
    """Первый администратор. Доступно, только пока в базе нет ни одного пользователя."""
    if await users_exist(session):
        raise HTTPException(status_code=409, detail="Администратор уже создан")

    user = await create_user(session, payload.username, payload.password)
    set_session_cookie(response, create_token(user))
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
    # Одинаковый ответ на «нет такого пользователя» и «неверный пароль»:
    # иначе по коду ответа можно перебирать существующие логины.
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        _attempts[ip].append(time.monotonic())
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")

    _attempts.pop(ip, None)
    set_session_cookie(response, create_token(user))
    return _account(user)


@router.post("/logout", status_code=204)
async def logout(response: Response) -> None:
    clear_session_cookie(response)


@router.get("/me", response_model=Account)
async def me(user: User = Depends(current_user)) -> Account:
    return _account(user)
