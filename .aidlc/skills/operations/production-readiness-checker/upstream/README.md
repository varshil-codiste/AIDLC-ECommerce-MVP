# Upstream — production-readiness-checker

This skill is **locally-authored** — the 12-section production-readiness-checklist.md schema is team-specific (defined in `operations/production-readiness.md`), and no single upstream skill walks that schema and validates each item against actual artifacts.

The wrapper at `../SKILL.md` carries the full validation logic. No companion upstream is recommended at this time; promotion of any future upstream readiness-validation skill happens via the normal authoring flow in `AUTHORING.md`.
