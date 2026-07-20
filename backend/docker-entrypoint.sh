#!/bin/sh
set -e

mkdir -p "${LIBRARY_PATH:-/data/library}" "${DOWNLOAD_TMP_PATH:-/data/tmp}" /app/logs
chown musichub:musichub "${LIBRARY_PATH:-/data/library}" "${DOWNLOAD_TMP_PATH:-/data/tmp}" /app/logs

until su-exec musichub npx prisma migrate deploy; do
  echo "Database not ready yet, retrying in 3s..."
  sleep 3
done

exec su-exec musichub node dist/main.js
