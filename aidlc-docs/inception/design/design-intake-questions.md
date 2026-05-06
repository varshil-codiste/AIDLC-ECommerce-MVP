# Design Intake — Choose Path

**Stage**: 2 — Design Intake (optional)
**Generated**: 2026-05-04T00:10:00Z

---

## Question 1
How would you like to provide the design assets?

A) Connect Figma via MCP — I have a Figma file and can connect the Figma MCP server
B) Provide screenshots — I'll drop screenshots of the screens, brand assets, and logo into a folder
C) Skip — design isn't ready yet (downstream stages will produce design-agnostic placeholders)
X) Other (please describe after `[Answer]:` tag below)

[Answer]: C  *(answered inline in chat — user chose C)*

---

## Question 2 (only if you chose A)
Paste the Figma file URL(s):

[Answer]: (skipped — chose C)

---

## Question 3 (only if you chose B)
Place the files into `aidlc-docs/inception/design/uploads/` and list the relative paths here, one per line. Add a one-word label for each (e.g., `home`, `cart`, `logo`).

[Answer]: (skipped — chose C)

---

## Question 4 (only if you chose C — Skip)
Why are you skipping design intake? (Pick the closest reason — recorded in audit.md and may inform downstream defaults.)

A) **Design will be done later — code first** — we'll iterate the visual layer once core flows work
B) **This is a backend/infra-only piece** — no UI surface (note: this contradicts the PRD; skip this option)
C) **Bugfix doesn't change UI** (note: this is a Greenfield project; skip this option)
D) **Designer not yet engaged** — design team will join later in M1–M2
X) Other (please describe after `[Answer]:` tag below — for example, "we said assets were ready but want to defer feeding them in until Stage 6")

[Answer]:A

---

## Note on the apparent tension with Round 1 Q7

In `business-requirements-followup-questions.md`, Q7 was answered **A — Brand assets ready, will be supplied at Stage 2**. By choosing C here, you are deferring that supply. This is fine — please pick the Q4 option that best describes the new intent so I can record the deferral cleanly.
