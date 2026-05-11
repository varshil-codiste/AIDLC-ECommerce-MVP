#!/usr/bin/env sh
# Container entrypoint for the API service.
# Runs DB migrations + extension setup before starting the Node server.
# This logic used to live in render-pre-deploy.sh, but Render's free tier
# does not support preDeployCommand — so we run it on every container start.
# CREATE EXTENSION / CREATE SCHEMA are idempotent, so re-running is safe.
set -e

cd /app

echo "[entrypoint] Ensuring extensions + schemas exist..."
npx prisma db execute --schema=./prisma/schema.prisma --stdin <<'SQL'
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS audit;
SQL

echo "[entrypoint] Applying Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] Starting API..."
exec "$@"
