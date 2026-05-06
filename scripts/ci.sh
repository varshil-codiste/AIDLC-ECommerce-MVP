#!/usr/bin/env bash
# CI entry. Routed by GH Actions path-filter via CHANGED_PATHS.
# NFR-PERF-UoW01-01 target: ≤ 3 min p95 on a clean GH Actions runner cache.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CHANGED_PATHS="${CHANGED_PATHS:-web,api,shared}"

if [[ "$CHANGED_PATHS" == *"web"* ]] || [[ "$CHANGED_PATHS" == *"shared"* ]]; then
  bash scripts/ci-web.sh
fi

if [[ "$CHANGED_PATHS" == *"api"* ]] || [[ "$CHANGED_PATHS" == *"shared"* ]]; then
  bash scripts/ci-api.sh
fi
