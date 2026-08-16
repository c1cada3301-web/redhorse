#!/bin/sh
set -e

# node_modules живут в named volume, исходники — bind-mount. Если lock-файл
# поменялся (или тома ещё нет), доставляем зависимости, иначе стартуем сразу.
LOCK_HASH="$(cksum package-lock.json 2>/dev/null | awk '{print $1}')"
STAMP_FILE="node_modules/.docker-npm-lock-hash"

needs_install=0
if [ ! -f node_modules/vite/bin/vite.js ]; then
  needs_install=1
elif [ ! -f "$STAMP_FILE" ] || [ "$(cat "$STAMP_FILE")" != "$LOCK_HASH" ]; then
  needs_install=1
fi

if [ "$needs_install" -eq 1 ]; then
  echo "Ставлю зависимости фронта (package-lock.json изменился или vite отсутствует)…"
  npm ci
  echo "$LOCK_HASH" > "$STAMP_FILE"
fi

exec "$@"
