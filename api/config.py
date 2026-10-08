from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Настройки берутся из окружения, префикс REDHORSE_ (см. api/.env)."""

    model_config = SettingsConfigDict(env_prefix="REDHORSE_", env_file=".env", extra="ignore")

    env: str = "production"

    # Docker Engine: сокет хоста, проброшенный в контейнер.
    docker_host: str | None = None

    # Origin'ы, с которых кроме самой панели разрешены изменяющие запросы и
    # вебсокеты. Нужен, когда фронт открыт с другого адреса: dev-сервер Vite
    # или прокси, переписывающий Host. Пример: ["http://localhost:3003"].
    trusted_origins: list[str] = []

    # --- раздача --------------------------------------------------------------
    # HTTP-порт и HTTPS-порт с самоподписанным сертификатом — как 9000 и 9443
    # у Portainer. 0 выключает HTTPS.
    http_port: int = 9000
    https_port: int = 9443
    # Свой сертификат вместо самоподписанного: пути к PEM-файлам.
    tls_cert: str = ""
    tls_key: str = ""
    # Каталог данных: самоподписанный сертификат кладём сюда же, в том.
    data_dir: str = "/data"
    # Каким адресам верить в X-Forwarded-For/Proto. Ставь адрес своего
    # обратного прокси, иначе подменить IP в лимите входа сможет кто угодно.
    forwarded_allow_ips: str = "127.0.0.1"

    # Сколько последних строк отдаём при открытии лога.
    log_default_tail: int = 500
    log_max_tail: int = 20_000

    # Период опроса docker stats, секунды.
    stats_interval: float = 2.0

    # Сколько завершённых сборок держим в памяти.
    build_history: int = 20

    # --- база данных -------------------------------------------------------
    # По умолчанию — файл в /data: так панель поднимается одной командой,
    # без отдельного сервера БД. Postgres подключается через REDHORSE_DATABASE_URL.
    database_url: str = "sqlite+aiosqlite:////data/redhorse.db"

    # --- авторизация -------------------------------------------------------
    # Секрет подписи JWT. Пустой — создаётся при первом старте и хранится в базе.
    jwt_secret: str = ""
    jwt_ttl_hours: int = 12

    # Имя cookie с токеном. Флаг Secure ставится сам, когда вход идёт по HTTPS;
    # cookie_secure=true требует его всегда (панель только за TLS-прокси).
    session_cookie: str = "redhorse_session"
    cookie_secure: bool = False

    # Первый администратор из окружения — когда таблица пользователей пуста.
    # Пустой пароль — администратора создаёт первый вошедший через UI.
    admin_user: str = "admin"
    admin_password: str = ""

    # Сколько минут после старта открыт экран создания администратора.
    # Дальше — только перезапуском, как у Portainer: иначе панелью, забытой
    # в сети без настройки, завладеет первый, кто её найдёт. 0 — без ограничения.
    setup_window_minutes: int = 5

    @property
    def is_production(self) -> bool:
        return self.env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
