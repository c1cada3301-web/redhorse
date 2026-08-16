#!/bin/sh
# Локальная разработка: фронт с горячей перезагрузкой на :3000, API с автоперезапуском на :8000
docker compose -f docker-compose.local.yml up --build "$@"
