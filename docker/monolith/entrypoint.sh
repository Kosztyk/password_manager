#!/usr/bin/env bash
set -euo pipefail

# Validate required env for backend
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"
: "${APP_MASTER_KEY:?APP_MASTER_KEY is required}"

# Start backend (nginx proxies to it)
node /app/backend/dist/index.js &

# Start nginx in foreground
exec nginx -g "daemon off;"
