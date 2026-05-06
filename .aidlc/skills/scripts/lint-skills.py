#!/usr/bin/env python3
"""
AI-DLC — SKILL.md frontmatter linter.

Validates every SKILL.md under a directory against the rules in
`.aidlc/skills/skill-policy.md` § Frontmatter conventions:

  - name: required; ^[a-z][a-z0-9-]{0,63}$; MUST equal folder basename
  - description: required; non-empty; <= 1024 chars
  - aidlc:
      - if present, must be a mapping with at least `sensitive: <bool>`
      - if sensitive=true, must include blast-radius and countersign-required-at
  - context: fork  -> warning (Claude-Code-specific, not portable)
  - argument-hint, allowed-tools, etc. -> warning (Claude-Code extensions)

Exit code 0 if all SKILL.md files pass; non-zero on any error.

Usage:
  python3 lint-skills.py <path>            # lints every SKILL.md beneath <path>
  python3 lint-skills.py <SKILL.md path>   # lints one file
  python3 lint-skills.py --help

No external dependencies (uses stdlib only — no PyYAML).
"""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

NAME_RE = re.compile(r"^[a-z][a-z0-9-]{0,63}$")
MAX_DESC = 1024
VALID_BLAST_RADII = {"production-deploy", "iac-apply", "payments", "secrets", "none"}
CLAUDE_ONLY_FIELDS = {
    "argument-hint",
    "allowed-tools",
    "disable-model-invocation",
    "user-invocable",
    "model",
    "context",
    "agent",
}


@dataclass
class Finding:
    level: str  # "error" or "warning"
    file: Path
    msg: str

    def render(self) -> str:
        tag = "ERROR" if self.level == "error" else "WARN "
        color = "\033[31m" if self.level == "error" else "\033[33m"
        reset = "\033[0m"
        return f"{color}{tag}{reset}  {self.file}\n         {self.msg}"


@dataclass
class LintReport:
    findings: list[Finding] = field(default_factory=list)
    files_scanned: int = 0

    def error(self, file: Path, msg: str) -> None:
        self.findings.append(Finding("error", file, msg))

    def warn(self, file: Path, msg: str) -> None:
        self.findings.append(Finding("warning", file, msg))

    def has_errors(self) -> bool:
        return any(f.level == "error" for f in self.findings)


# ---------------------------------------------------------------------------
# Tiny YAML-frontmatter parser. Stdlib-only because skills run in environments
# without PyYAML. Handles the subset AI-DLC skills actually use:
#   key: value
#   key: |
#     multiline value
#   nested:
#     subkey: value
# Booleans true/false; strings as-is; one level of nesting.
# ---------------------------------------------------------------------------
def parse_frontmatter(text: str) -> tuple[dict | None, str | None]:
    """Return (frontmatter_dict, error_msg). frontmatter_dict is None if no frontmatter."""
    if not text.startswith("---\n") and not text.startswith("---\r\n"):
        return None, "no YAML frontmatter (file must begin with '---')"

    # Find the closing ---
    rest = text[4:] if text.startswith("---\n") else text[5:]
    closing = re.search(r"\n---\s*(\n|$)", rest)
    if not closing:
        return None, "frontmatter has no closing '---'"

    fm_text = rest[: closing.start()]
    return _parse_block(fm_text.splitlines())


def _parse_block(lines: list[str]) -> tuple[dict, str | None]:
    """Parse a flat-or-one-level-nested YAML-like block."""
    out: dict = {}
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.rstrip()

        if not stripped or stripped.lstrip().startswith("#"):
            i += 1
            continue

        # Top-level key: detect by zero leading spaces
        if line and line[0] not in (" ", "\t"):
            m = re.match(r"^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$", stripped)
            if not m:
                return out, f"could not parse line: {stripped!r}"
        else:
            # Indented line at the top level shouldn't happen — caught by
            # nested-block consumers below; if we see it here, parser desync.
            return out, f"unexpected indentation at top level: {line!r}"

        key, value = m.group(1), m.group(2).strip()

        if value in ("|", ">", "|-", ">-", "|+", ">+"):
            # YAML block scalar (literal | or folded >).
            # Consume any line whose indentation is greater than the key line's.
            block_lines = []
            i += 1
            while i < len(lines):
                next_line = lines[i]
                if not next_line.strip():
                    # Blank lines belong to the block.
                    block_lines.append("")
                    i += 1
                    continue
                # Any indentation at all means "still inside the block."
                if next_line[0] in (" ", "\t"):
                    block_lines.append(next_line.lstrip())
                    i += 1
                else:
                    break
            joined = "\n".join(block_lines).strip()
            # For folded style (>), join lines with spaces.
            if value.startswith(">"):
                joined = " ".join(line for line in joined.split("\n") if line)
            out[key] = joined
            continue

        if value == "":
            # Nested mapping
            nested: dict = {}
            i += 1
            while i < len(lines):
                next_line = lines[i]
                if not next_line.strip():
                    i += 1
                    continue
                if next_line.startswith(("  ", "\t")):
                    sub = re.match(
                        r"^\s+([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$", next_line
                    )
                    if not sub:
                        return out, f"could not parse nested line: {next_line!r}"
                    nested[sub.group(1)] = _coerce(sub.group(2).strip())
                    i += 1
                else:
                    break
            out[key] = nested
            continue

        out[key] = _coerce(value)
        i += 1

    return out, None


def _coerce(raw: str) -> object:
    """Loose coercion: bool / int / quoted string / bare string."""
    if raw in ("true", "True"):
        return True
    if raw in ("false", "False"):
        return False
    if raw.startswith(('"', "'")) and raw.endswith(raw[0]) and len(raw) >= 2:
        return raw[1:-1]
    try:
        return int(raw)
    except ValueError:
        pass
    return raw


# ---------------------------------------------------------------------------
# Lint logic
# ---------------------------------------------------------------------------
def lint_skill(path: Path, report: LintReport) -> None:
    report.files_scanned += 1
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        report.error(path, f"file is not valid UTF-8: {exc}")
        return

    fm, err = parse_frontmatter(text)
    if err:
        report.error(path, err)
        return
    if fm is None:
        report.error(path, "missing YAML frontmatter")
        return

    # name
    name = fm.get("name")
    if not name:
        report.error(path, "frontmatter missing required field 'name'")
    elif not isinstance(name, str):
        report.error(path, f"'name' must be a string, got {type(name).__name__}")
    else:
        if not NAME_RE.match(name):
            report.error(
                path,
                f"'name'='{name}' fails regex {NAME_RE.pattern} "
                "(lowercase letters, digits, hyphens; max 64 chars; must start with a letter)",
            )
        folder = path.parent.name
        if name != folder:
            report.error(
                path,
                f"folder basename '{folder}' != name field '{name}'  "
                "(causes silent failures in VS Code/Copilot)",
            )

    # description
    desc = fm.get("description")
    if not desc:
        report.error(path, "frontmatter missing required field 'description'")
    elif not isinstance(desc, str):
        report.error(
            path, f"'description' must be a string, got {type(desc).__name__}"
        )
    elif len(desc) > MAX_DESC:
        report.error(
            path,
            f"'description' is {len(desc)} chars (max {MAX_DESC})",
        )
    elif "<" in desc and ">" in desc:
        # XML tags are forbidden by Anthropic spec
        if re.search(r"<[a-zA-Z]", desc):
            report.error(
                path, "'description' must not contain XML tags (Anthropic spec)"
            )

    # AI-DLC extension block
    aidlc = fm.get("aidlc")
    if aidlc is not None:
        if not isinstance(aidlc, dict):
            report.error(path, "'aidlc' must be a mapping")
        else:
            sensitive = aidlc.get("sensitive")
            if sensitive is None:
                report.error(
                    path, "'aidlc.sensitive' is required when 'aidlc' block present"
                )
            elif not isinstance(sensitive, bool):
                report.error(path, "'aidlc.sensitive' must be a boolean")
            elif sensitive is True:
                blast = aidlc.get("blast-radius")
                if blast not in VALID_BLAST_RADII:
                    report.error(
                        path,
                        f"sensitive=true requires 'aidlc.blast-radius' "
                        f"to be one of {sorted(VALID_BLAST_RADII)}, got {blast!r}",
                    )
                csa = aidlc.get("countersign-required-at")
                if not csa:
                    report.error(
                        path,
                        "sensitive=true requires 'aidlc.countersign-required-at' "
                        "(typically 'per-action-signoff')",
                    )

    # Claude-Code-specific fields → warning (not error)
    for fld in CLAUDE_ONLY_FIELDS:
        if fld in fm:
            report.warn(
                path,
                f"frontmatter field '{fld}' is Claude-Code-specific; "
                "may be ignored by Cursor / Codex / Gemini / Copilot",
            )

    # Soft body warnings
    body = text[text.find("---", 4) + 3 :].lstrip("\n") if "---" in text[4:] else ""
    if body and not body.lstrip().startswith("#"):
        report.warn(path, "body should start with a top-level H1 heading")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def find_skill_files(target: Path) -> list[Path]:
    if target.is_file():
        return [target] if target.name == "SKILL.md" else []
    return sorted(target.rglob("SKILL.md"))


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
    parser.add_argument(
        "path", type=Path, help="directory to scan, or a single SKILL.md file"
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="treat warnings as errors",
    )
    args = parser.parse_args(argv)

    if not args.path.exists():
        print(f"path not found: {args.path}", file=sys.stderr)
        return 2

    report = LintReport()
    files = find_skill_files(args.path)

    if not files:
        # Phase F1 has no skills yet — that's fine.
        print(f"(no SKILL.md files found under {args.path})")
        return 0

    for f in files:
        lint_skill(f, report)

    errors = sum(1 for x in report.findings if x.level == "error")
    warnings = sum(1 for x in report.findings if x.level == "warning")

    for finding in report.findings:
        print(finding.render(), file=sys.stderr)

    summary = (
        f"\nlint-skills: scanned {report.files_scanned} SKILL.md "
        f"file(s) — {errors} error(s), {warnings} warning(s)"
    )
    print(summary)

    if errors > 0 or (args.strict and warnings > 0):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
