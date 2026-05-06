#!/usr/bin/env bash
# AI-DLC — Skill installer
# Creates IDE-specific symlink shims so every supported agent (Claude Code, Cursor,
# GitHub Copilot, Codex CLI, Gemini CLI, Cline, Windsurf, OpenCode, …) finds the same
# canonical skills tree at .aidlc/skills/.
#
# Usage:
#   bash .aidlc/skills/scripts/install-aidlc-skills.sh           # install
#   bash .aidlc/skills/scripts/install-aidlc-skills.sh --reset   # remove + reinstall
#   bash .aidlc/skills/scripts/install-aidlc-skills.sh --diagnose  # report only

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${SKILLS_DIR}/../.." && pwd)"

# Each shim path is RELATIVE to project root and points BACK at the canonical skills dir.
# The relative target works inside the project without absolute paths.
CANONICAL_REL=".aidlc/skills"

# IDE / agent shim locations (project-level).
# Each entry is "<shim-path>=<relative-target-from-shim>".
SHIMS=(
  ".claude/skills=../.aidlc/skills"
  ".cursor/skills=../.aidlc/skills"
  ".github/skills=../.aidlc/skills"
  ".agents/skills=../.aidlc/skills"
)

MODE="install"
case "${1:-}" in
  --reset)    MODE="reset" ;;
  --diagnose) MODE="diagnose" ;;
  --help|-h)
    sed -n '1,15p' "$0"
    exit 0
    ;;
esac

cyan() { printf '\033[36m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
red() { printf '\033[31m%s\033[0m\n' "$*"; }

cd "${PROJECT_ROOT}"

cyan "AI-DLC — Skills Installer"
cyan "Project root: ${PROJECT_ROOT}"
cyan "Canonical:    ${CANONICAL_REL}"
echo ""

if [ ! -d "${CANONICAL_REL}" ]; then
  red "ERROR: ${CANONICAL_REL} not found. Are you running this from the project root?"
  exit 1
fi

# ── Reset mode ────────────────────────────────────────────────────────────────
if [ "${MODE}" = "reset" ]; then
  yellow "Reset mode: removing existing shims..."
  for entry in "${SHIMS[@]}"; do
    shim_path="${entry%%=*}"
    if [ -L "${shim_path}" ]; then
      rm "${shim_path}"
      echo "  removed symlink: ${shim_path}"
    elif [ -d "${shim_path}" ]; then
      yellow "  skipped (real directory, not a symlink): ${shim_path}"
    fi
  done
  echo ""
fi

# ── Diagnose mode ─────────────────────────────────────────────────────────────
if [ "${MODE}" = "diagnose" ]; then
  cyan "Diagnose mode — read-only report."
  echo ""
  for entry in "${SHIMS[@]}"; do
    shim_path="${entry%%=*}"
    target="${entry##*=}"
    if [ -L "${shim_path}" ]; then
      actual="$(readlink "${shim_path}")"
      if [ "${actual}" = "${target}" ]; then
        green "  ✓ ${shim_path} → ${actual}"
      else
        yellow "  ! ${shim_path} → ${actual}  (expected: ${target})"
      fi
    elif [ -d "${shim_path}" ]; then
      yellow "  ! ${shim_path} exists as a real directory (not a symlink)"
    else
      red   "  ✗ ${shim_path} missing"
    fi
  done
  echo ""
fi

# ── Install mode (and reset's recreate phase) ────────────────────────────────
if [ "${MODE}" = "install" ] || [ "${MODE}" = "reset" ]; then
  cyan "Creating shims..."
  for entry in "${SHIMS[@]}"; do
    shim_path="${entry%%=*}"
    target="${entry##*=}"
    parent="$(dirname "${shim_path}")"

    mkdir -p "${parent}"

    if [ -L "${shim_path}" ]; then
      actual="$(readlink "${shim_path}")"
      if [ "${actual}" = "${target}" ]; then
        green "  ✓ ${shim_path} already points to ${target}"
        continue
      else
        yellow "  ! ${shim_path} points to ${actual} — recreating"
        rm "${shim_path}"
      fi
    elif [ -d "${shim_path}" ]; then
      red "  ✗ ${shim_path} is a real directory; refusing to overwrite. Move it aside first."
      continue
    fi

    ln -s "${target}" "${shim_path}"
    green "  ✓ created: ${shim_path} → ${target}"
  done
  echo ""
fi

# ── Lint pass ─────────────────────────────────────────────────────────────────
cyan "Running frontmatter lint..."
if [ -x "${SCRIPT_DIR}/lint-skills.py" ]; then
  if python3 "${SCRIPT_DIR}/lint-skills.py" "${SKILLS_DIR}"; then
    green "  ✓ lint passed"
  else
    yellow "  ! lint reported issues (see output above)"
  fi
else
  yellow "  ! lint-skills.py not found or not executable"
fi
echo ""

# ── Catalog summary ───────────────────────────────────────────────────────────
cyan "Loaded skills:"
skill_count=0
while IFS= read -r skill_md; do
  rel="${skill_md#${SKILLS_DIR}/}"
  echo "  • ${rel%/SKILL.md}"
  skill_count=$((skill_count + 1))
done < <(find "${SKILLS_DIR}" -mindepth 2 -maxdepth 4 -name "SKILL.md" -type f 2>/dev/null | sort)

if [ "${skill_count}" -eq 0 ]; then
  yellow "  (no SKILL.md files yet — Phases F2–F5 will populate this)"
fi
echo ""

green "Done. Total skills: ${skill_count}."
echo ""
yellow "Cursor users: after installing or updating skills, run Developer: Reload Window (Cmd+Shift+P)."
