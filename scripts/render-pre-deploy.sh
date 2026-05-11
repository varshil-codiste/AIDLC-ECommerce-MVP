#!/usr/bin/env bash
# Render pre-deploy hook for the API service.
# Runs once per deploy, before the container starts serving traffic.
#   1. Ensures required Postgres extensions and schemas exist (Render's managed
#      Postgres does NOT run our infra/postgres/init.sql).
#   2. Applies pending Prisma migrations.
set -euo pipefail

cd "$(dirname "$0")/../api"

echo "[pre-deploy] Ensuring extensions + schemas exist..."
npx prisma db execute --schema=./prisma/schema.prisma --stdin <<'SQL'
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS audit;
SQL

echo "[pre-deploy] Applying Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "[pre-deploy] Done."
