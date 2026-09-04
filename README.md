# Dala

Веб-панель управления Docker: контейнеры, образы, тома, сети, логи и очистка.

## Установка

Одной командой, как Portainer:

```bash
docker run -d \
  --name dala \
  --restart unless-stopped \
  -p 9000:9000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v dala_data:/data \
  dala/dala:latest
```

Открой `http://<адрес-сервера>:9000` и создай администратора — при первом
заходе панель сама предложит это сделать.

Что здесь важно:

- `/var/run/docker.sock` — то, ради чего панель существует. Доступ к сокету
  равнозначен root на машине, поэтому не публикуй порт в интернет без
  обратного прокси с TLS.
- `dala_data` — том с базой. Без него настройки и учётные записи пропадут
  вместе с контейнером.
- Секрет подписи сессий создаётся при первом старте и хранится в базе:
  задавать его вручную не нужно, перезапуск не разлогинивает.

### С внешним Postgres

Файловая база подходит для одного сервера. Если панель ставится рядом с
существующим Postgres, укажи строку подключения:

```bash
docker run -d --name dala -p 9000:9000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e DALA_DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dala \
  dala/dala:latest
```

## Настройки

Все переменные читаются с префиксом `DALA_`:

| Переменная | Умолчание | Зачем |
|---|---|---|
| `DALA_DATABASE_URL` | `sqlite+aiosqlite:////data/dala.db` | Где хранить учётные записи и настройки |
| `DALA_JWT_SECRET` | создаётся сам | Общий секрет, если установок несколько |
| `DALA_ADMIN_USER` / `DALA_ADMIN_PASSWORD` | — | Создать администратора без UI |
| `DALA_LOG_DEFAULT_TAIL` | `500` | Сколько строк лога отдавать сразу |
| `DALA_STATS_INTERVAL` | `2.0` | Период опроса статистики, секунды |

## Разработка

```bash
docker compose -f docker-compose.local.yml up --build
```

Фронт на `http://localhost:3000` с горячей заменой модулей, API на
`http://localhost:8000/docs`, Postgres на `127.0.0.1:5433`.

Прод-схема с отдельными nginx и Postgres — `docker-compose.yml`.
