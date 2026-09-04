# syntax=docker/dockerfile:1

# Единый образ панели: фронт, API и файловая база в одном контейнере.
# Ставится одной командой, как Portainer:
#
#   docker run -d --name dala -p 9000:9000 \
#     -v /var/run/docker.sock:/var/run/docker.sock \
#     -v dala_data:/data \
#     dala/dala:latest

# --- сборка фронта ---------------------------------------------------------
FROM node:22-alpine AS web

WORKDIR /web
COPY front/package.json front/package-lock.json ./
RUN npm ci

COPY front/ ./
RUN npm run build

# --- зависимости Python ----------------------------------------------------
FROM python:3.13-slim AS deps

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# нужны для сборки колёс: asyncpg, python-Levenshtein, pillow
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY api/requirements.txt .
RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --upgrade pip \
    && /opt/venv/bin/pip install -r requirements.txt

# --- рантайм ---------------------------------------------------------------
FROM python:3.13-slim

LABEL org.opencontainers.image.title="Dala" \
      org.opencontainers.image.description="Веб-панель управления Docker" \
      org.opencontainers.image.source="https://github.com/dala/dala"

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    DALA_ENV=production

COPY --from=deps /opt/venv /opt/venv

WORKDIR /app
COPY api/ ./
# Собранный фронт кладём рядом: API отдаёт его сам, отдельный nginx не нужен.
COPY --from=web /web/dist ./static

# Данные (файловая база) живут в томе, иначе теряются с контейнером.
VOLUME ["/data"]
EXPOSE 9000

# Работаем от root: доступ к docker.sock иначе не получить, а именно ради него
# панель и существует. Порт наружу открывает тот, кто запускает контейнер.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "9000"]
