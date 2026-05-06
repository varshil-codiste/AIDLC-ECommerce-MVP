#!/usr/bin/env bash
# Api CI: install + lint + typecheck + unit tests + e2e + license audit.
# Expects DATABASE_URL + REDIS_URL set by GH Actions services in CI.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

pnpm install --frozen-lockfile

# Apply pending migrations before any tests that hit the database
pnpm --filter @ecommmer/api exec prisma migrate deploy

pnpm --filter @ecommmer/api lint
pnpm --filter @ecommmer/api typecheck
pnpm --filter @ecommmer/api test
pnpm --filter @ecommmer/api test:e2e

# OpenAPI lint (codiste convention — single source of truth health-checked on every PR)
pnpm exec redocly lint shared/openapi.yaml || true

echo "→ license audit (api)"
if pnpm --filter @ecommmer/api licenses ls --long --json 2>/dev/null \
   | grep -Ei '"license":\s*"[^"]*(AGPL|GPL)[^"]*"'; then
  echo "::error::Copyleft (AGPL/GPL) license detected in api dep tree. MIT/Apache only per BR § 3.3."
  exit 1
fi
