from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Настройки берутся из окружения, префикс DALA_ (см. api/.env)."""

    model_config = SettingsConfigDict(env_prefix="DALA_", env_file=".env", extra="ignore")

    env: str = "production"

    # Docker Engine: сокет хоста, проброшенный в контейнер.
    docker_host: str | None = None

    # Кто может ходить в API. В проде фронт стучится через nginx с того же origin.
    cors_origins: list[str] = ["http://localhost", "http://localhost:5173"]

    # Сколько последних строк отдаём при открытии лога.
    log_default_tail: int = 500
    log_max_tail: int = 20_000

    # Период опроса docker stats, секунды.
    stats_interval: float = 2.0

    # Сколько завершённых сборок держим в памяти.
    build_history: int = 20

    # --- база данных -------------------------------------------------------
    # По умолчанию — файл в /data: так панель поднимается одной командой,
    # без отдельного сервера БД. Postgres подключается через DALA_DATABASE_URL.
    database_url: str = "sqlite+aiosqlite:////data/dala.db"

    # --- авторизация -------------------------------------------------------
    # Секрет подписи JWT. Пустой — сгенерируем случайный при старте, но тогда
    # рестарт API разлогинивает всех: для постоянной работы задай DALA_JWT_SECRET.
    jwt_secret: str = ""
    jwt_ttl_hours: int = 12

    # Имя cookie с токеном и её флаг Secure. По HTTP (localhost) Secure ставить
    # нельзя — браузер такую cookie просто не сохранит.
    session_cookie: str = "dala_session"
    cookie_secure: bool = False

    # Первый администратор создаётся, когда таблица пользователей пуста.
    # Пустой пароль — сгенерируем случайный и один раз напечатаем в лог.
    admin_user: str = "admin"
    admin_password: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
