#!/usr/bin/env bash
# Web CI: install + lint + typecheck + tests + license audit.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

pnpm install --frozen-lockfile

pnpm --filter @ecommmer/web lint
pnpm --filter @ecommmer/web typecheck
pnpm --filter @ecommmer/web test

# License audit — fail on any AGPL/GPL transitive dep (BR § 3.3 / NFR-SEC-UoW01-02).
echo "→ license audit (web)"
if pnpm --filter @ecommmer/web licenses ls --long --json 2>/dev/null \
   | grep -Ei '"license":\s*"[^"]*(AGPL|GPL)[^"]*"'; then
  echo "::error::Copyleft (AGPL/GPL) license detected in web dep tree. MIT/Apache only per BR § 3.3."
  exit 1
fi
