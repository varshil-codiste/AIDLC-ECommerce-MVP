#!/usr/bin/env bash
# Local dev orchestrator. Brings up postgres + redis + api + web.
# NFR-PERF-UoW01-02 target: cold-start ≤ 90 s on a developer laptop.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "→ starting docker-compose data tier (postgres, redis)"
docker compose -f infra/docker-compose.yml up -d

echo "→ waiting for postgres to be healthy"
for i in {1..30}; do
  if docker compose -f infra/docker-compose.yml ps postgres | grep -q "healthy"; then
    break
  fi
  sleep 2
done

if [[ ! -d node_modules ]]; then
  echo "→ installing root deps"
  pnpm install --frozen-lockfile
fi

echo "→ generating Prisma client (no models yet — placeholder)"
pnpm --filter @ecommmer/api exec prisma generate || true

echo "→ launching api (background) + web (foreground)"
pnpm --filter @ecommmer/api dev &
API_PID=$!
trap "kill $API_PID 2>/dev/null || true" EXIT

pnpm --filter @ecommmer/web dev
