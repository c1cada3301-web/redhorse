# Dala

Веб-панель управления Docker: контейнеры, образы, тома, сети, логи и очистка.

## Установка

Одной командой, как Portainer:

```bash
docker run -d \
  --name dala \
  --restart unless-stopped \
  -p 9443:9443 -p 9000:9000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v dala_data:/data \
  dala/dala:latest
```

Открой `https://<адрес-сервера>:9443` и создай администратора — при первом
заходе панель сама предложит это сделать. На это есть 5 минут после старта:
не успел — перезапусти контейнер. Иначе панелью, забытой в сети без
настройки, завладел бы первый, кто её нашёл.

Сертификат на 9443 самоподписанный, браузер один раз предупредит. Порт 9000 —
обычный HTTP; если панель смотрит наружу, не публикуй его.

Что здесь важно:

- `/var/run/docker.sock` — то, ради чего панель существует. Доступ к сокету
  равнозначен root на машине, поэтому не публикуй порт в интернет без
  обратного прокси с TLS.
- `dala_data` — том с базой и сертификатом. Без него настройки и учётные записи пропадут
  вместе с контейнером.
- Секрет подписи сессий создаётся при первом старте и хранится в базе:
  задавать его вручную не нужно, перезапуск не разлогинивает.

##### Свой сертификат или обратный прокси

Свой сертификат кладётся в том и указывается через `DALA_TLS_CERT` и
`DALA_TLS_KEY`. За обратным прокси с TLS (Caddy, Traefik, nginx) HTTPS-порт
можно выключить (`DALA_HTTPS_PORT=0`), а адрес прокси указать в
`DALA_FORWARDED_ALLOW_IPS` — тогда панель верит его `X-Forwarded-Proto` и
лимит входа видит настоящие адреса клиентов.

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
| `DALA_SETUP_WINDOW_MINUTES` | `5` | Сколько минут после старта открыт экран создания администратора; `0` — без ограничения |
| `DALA_HTTP_PORT` / `DALA_HTTPS_PORT` | `9000` / `9443` | Порты внутри контейнера; `DALA_HTTPS_PORT=0` выключает HTTPS |
| `DALA_TLS_CERT` / `DALA_TLS_KEY` | — | Свой сертификат вместо самоподписанного |
| `DALA_FORWARDED_ALLOW_IPS` | `127.0.0.1` | Каким прокси верить в `X-Forwarded-*` |
| `DALA_TRUSTED_ORIGINS` | `[]` | Дополнительные адреса, с которых открывают панель (JSON-список) |
| `DALA_COOKIE_SECURE` | `false` | Требовать Secure у cookie и по HTTP — когда TLS снимает прокси |
| `DALA_LOG_DEFAULT_TAIL` | `500` | Сколько строк лога отдавать сразу |
| `DALA_STATS_INTERVAL` | `2.0` | Период опроса статистики, секунды |

## Разработка

```bash
docker compose -f docker-compose.local.yml up --build
```

Фронт на `http://localhost:3003` с горячей заменой модулей, API на
`http://localhost:8000/docs`, Postgres на `127.0.0.1:5433`.

Прод-схема — `docker-compose.yml`: тот же единый контейнер, что и в
`docker run` выше.

Тесты API:

```bash
cd api
pip install -r requirements-dev.txt
pytest tests
```

Образ сразу под amd64 и arm64:

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t dala/dala:latest --push .
```
