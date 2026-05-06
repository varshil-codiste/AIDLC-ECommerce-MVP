#!/usr/bin/env bash
# AI-DLC — first-run profile initializer
#
# Creates the project's aidlc-docs/ tree if it doesn't exist and copies the
# profile template into place. Idempotent: re-running on a project that's
# already initialized does nothing destructive.
#
# Usage:
#   bash .aidlc/skills/scripts/init-aidlc.sh                 # interactive
#   bash .aidlc/skills/scripts/init-aidlc.sh --preset codiste  # apply named preset
#   bash .aidlc/skills/scripts/init-aidlc.sh --check         # report-only
#
# Run from the project repo root.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AIDLC_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PROJECT_ROOT="$(cd "${AIDLC_ROOT}/.." && pwd)"

AIDLC_DOCS="${PROJECT_ROOT}/aidlc-docs"
PROFILE="${AIDLC_DOCS}/aidlc-profile.md"
TEMPLATE="${AIDLC_ROOT}/presets/aidlc-profile.template.md"
PRESETS_DIR="${AIDLC_ROOT}/presets"

MODE="install"
PRESET=""
case "${1:-}" in
  --check)   MODE="check" ;;
  --preset)
    if [ -z "${2:-}" ]; then
      echo "ERROR: --preset requires a name (e.g., --preset codiste)"
      echo "Available presets:"
      ls "${PRESETS_DIR}" 2>/dev/null | grep -v 'template\|^\.' | sed 's|\.md$||' | sed 's|^|  - |'
      exit 1
    fi
    PRESET="$2"
    ;;
  --help|-h)
    sed -n '1,16p' "$0"
    exit 0
    ;;
esac

cyan() { printf '\033[36m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
red() { printf '\033[31m%s\033[0m\n' "$*"; }

cd "${PROJECT_ROOT}"

cyan "AI-DLC — Profile Initializer"
cyan "Project root: ${PROJECT_ROOT}"
cyan "Mode:         ${MODE}${PRESET:+ (preset: ${PRESET})}"
echo ""

# ── Check mode ───────────────────────────────────────────────────────────────
if [ "${MODE}" = "check" ]; then
  cyan "Check mode — read-only report."
  echo ""
  if [ -f "${PROFILE}" ]; then
    green "  ✓ aidlc-profile.md exists at: ${PROFILE}"
    if grep -q "<your team or org name>" "${PROFILE}"; then
      yellow "  ! profile has unfilled placeholders (e.g., team.name) — fill them at first invocation"
    else
      green "  ✓ profile appears populated"
    fi
  else
    red "  ✗ aidlc-profile.md missing — run without --check to install"
  fi

  if [ -d "${AIDLC_DOCS}" ]; then
    green "  ✓ aidlc-docs/ exists at: ${AIDLC_DOCS}"
  else
    red "  ✗ aidlc-docs/ missing — run without --check to create"
  fi

  echo ""
  echo "Available presets:"
  ls "${PRESETS_DIR}" 2>/dev/null | grep -v 'template\|^\.' | sed 's|\.md$||' | sed 's|^|  - |' || echo "  (none found)"
  exit 0
fi

# ── Install mode ─────────────────────────────────────────────────────────────
if [ ! -f "${TEMPLATE}" ]; then
  red "ERROR: profile template not found at ${TEMPLATE}"
  exit 1
fi

# Create aidlc-docs/ if missing.
if [ ! -d "${AIDLC_DOCS}" ]; then
  mkdir -p "${AIDLC_DOCS}"
  green "  ✓ created aidlc-docs/"
else
  cyan "  · aidlc-docs/ already exists"
fi

# Install profile from template if missing.
if [ ! -f "${PROFILE}" ]; then
  cp "${TEMPLATE}" "${PROFILE}"
  green "  ✓ installed aidlc-profile.md from template"
else
  cyan "  · aidlc-profile.md already exists — leaving untouched"
fi

# Apply preset if requested.
if [ -n "${PRESET}" ]; then
  PRESET_FILE="${PRESETS_DIR}/${PRESET}.md"
  if [ ! -f "${PRESET_FILE}" ]; then
    red "ERROR: preset '${PRESET}' not found at ${PRESET_FILE}"
    echo "Available presets:"
    ls "${PRESETS_DIR}" 2>/dev/null | grep -v 'template\|^\.' | sed 's|\.md$||' | sed 's|^|  - |'
    exit 1
  fi

  # Stamp the preset name into the profile's "preset:" field if still placeholder.
  if grep -q '^preset: "<name>"' "${PROFILE}"; then
    sed -i '' "s|^preset: \"<name>\".*|preset: \"${PRESET}\"|" "${PROFILE}"
    green "  ✓ recorded preset='${PRESET}' in aidlc-profile.md"
  elif grep -q "^preset: \"${PRESET}\"" "${PROFILE}"; then
    cyan "  · preset='${PRESET}' already recorded"
  else
    yellow "  ! aidlc-profile.md already names a different preset — not overwriting"
  fi

  cyan ""
  cyan "Preset details: ${PRESET_FILE}"
  cyan "Read it and copy any sections into aidlc-profile.md you want to apply."
fi

echo ""
green "Done."
echo ""
yellow "Next steps:"
echo "  1. Fill the placeholders in: ${PROFILE}"
echo "     (team name, pod roles, stack recommendations, operations preferences)"
echo "  2. Run: bash .aidlc/skills/scripts/install-aidlc-skills.sh"
echo "  3. In your AI assistant, type: Using AI-DLC, <your task>"
