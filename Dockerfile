# syntax=docker/dockerfile:1

# Единый образ панели: фронт, API и файловая база в одном контейнере.
# Ставится одной командой, как Portainer:
#
#   docker run -d --name redhorse -p 9443:9443 -p 9000:9000 \
#     -v /var/run/docker.sock:/var/run/docker.sock \
#     -v redhorse_data:/data \
#     redhorse/redhorse:latest

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

# компилятор — на случай, если под платформу нет готового колеса (arm/v7)
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY api/requirements.txt .
RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --upgrade pip \
    && /opt/venv/bin/pip install -r requirements.txt

# --- рантайм ---------------------------------------------------------------
FROM python:3.13-slim

LABEL org.opencontainers.image.title="RedHorse" \
      org.opencontainers.image.description="Веб-панель управления Docker" \
      org.opencontainers.image.source="https://github.com/c1cada3301-web/redhorse"

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    REDHORSE_ENV=production

COPY --from=deps /opt/venv /opt/venv

WORKDIR /app
COPY api/ ./
# Собранный фронт кладём рядом: API отдаёт его сам, отдельный nginx не нужен.
COPY --from=web /web/dist ./static

# Данные (файловая база, сертификат) живут в томе, иначе теряются с контейнером.
VOLUME ["/data"]
# 9443 — HTTPS с самоподписанным сертификатом, 9000 — HTTP, как у Portainer.
EXPOSE 9000 9443

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:9000/api/health', timeout=4)"]

# Работаем от root: доступ к docker.sock иначе не получить, а именно ради него
# панель и существует. Порт наружу открывает тот, кто запускает контейнер.
CMD ["python", "serve.py"]
