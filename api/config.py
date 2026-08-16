from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Настройки берутся из окружения, префикс RH_ (см. api/.env)."""

    model_config = SettingsConfigDict(env_prefix="RH_", env_file=".env", extra="ignore")

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


@lru_cache
def get_settings() -> Settings:
    return Settings()
