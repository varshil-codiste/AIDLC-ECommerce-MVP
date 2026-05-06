# Accessibility (WCAG 2.2 AA) — Opt-In

**Extension**: Accessibility — WCAG 2.2 AA (team-specific — Web + Mobile a11y rules)
**Full rule file**: `extensions/accessibility/wcag22-aa/accessibility.md`

---

## Opt-In Prompt

```markdown
## Question: Accessibility Extension (WCAG 2.2 AA)
Does this project have a UI surface (Web or Mobile) that should comply with WCAG 2.2 AA?

A) Yes — enforce all WCAG 2.2 AA rules as blocking constraints (Recommended for any consumer-facing product, government / education / healthcare clients, or projects with regulatory accessibility commitments)
B) Partial — enforce only "Level A" rules (suitable for internal tools where full AA is not a contractual requirement)
C) No — this project has no UI OR a11y is explicitly out of scope (e.g., backend-only, internal admin)
X) Other (please describe after [Answer]: tag below)

[Answer]:
```

- `A` → load full `accessibility.md`; AA rules apply at Functional Design, Code Generation, Code Review, Build & Test, Production Readiness
- `B` → load `accessibility.md`; AA-only rules marked N/A; A-level remain blocking
- `C` → never load
- `X` → clarify
