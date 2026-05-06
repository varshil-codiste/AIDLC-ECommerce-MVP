---
name: screenshot-design-parser
description: |
  Use when the user chose path B (Screenshots) at AI-DLC Stage 2 (Design Intake). Reads screenshots dropped into aidlc-docs/inception/design/uploads/, extracts brand assets (logo, colors), best-effort typography and spacing, and a screen-flow map by combining image inspection with the user's labeled list. Produces the three canonical design artifacts: branding.md, design-tokens.md (W3C Design Tokens format), and screen-flow-map.md. Estimated values are flagged "approximate — confirm with designer" so the pod knows what to verify.
aidlc:
  sensitive: false
---

# Screenshot Design Parser

## When to Use (AI-DLC context)

This skill fires at **Stage 2 — Design Intake** (`../../aidlc-rule-details/inception/design-intake.md`) Step 2B, when the user has answered "B) Provide Screenshots" to the design-intake-questions.md. It is the alternative to `figma-mcp-extractor` (path A) and is the **fallback** when Figma MCP isn't configured.

It expects the user to have placed screenshots in `aidlc-docs/inception/design/uploads/` and labeled them in Q3's `[Answer]:` block (one filename + one-word label per line).

## What It Does

1. Verifies every listed file exists in `uploads/`; flags any missing
2. For each image: extracts dominant color palette (top 5 hex), reads dimensions, captures the user's label
3. Synthesizes the three the three canonical design artifacts:
   - **branding.md** — logo references, brand color palette, voice/tone (only if user provided a brand-guide screenshot)
   - **design-tokens.md** — W3C Design Tokens with **approximate values flagged** (typography sizes are estimated from screenshots; spacing is inferred; AI does NOT invent values it can't see)
   - **screen-flow-map.md** — derived from the user's labels + a navigation question file the AI generates ("from the Login screen, where does the user go?")

Because screenshots are lossier than Figma, this skill emits more open questions in the screen-flow-map than path A typically does — that's expected.

## Inputs

- `aidlc-docs/inception/design/design-intake-questions.md` (answer to Q1=B; Q3 = file list with labels)
- `aidlc-docs/inception/design/uploads/<filename>.{png,jpg,jpeg,webp}`

## Outputs

- `aidlc-docs/inception/design/branding.md`
- `aidlc-docs/inception/design/design-tokens.md` (with approximate values flagged)
- `aidlc-docs/inception/design/screen-flow-map.md`
- `aidlc-docs/inception/design/navigation-questions.md` (open questions about transitions between screens — pod answers in the same multi-choice format)

## Governance

- **Free-roam invocation**: standard audit.md entry
- **Sensitive flag**: no
- **Tier scope**: Greenfield, Feature (only when FE or Mobile is in scope)

## Team Conventions Applied

- Token values that can't be visually estimated are emitted as `null` with a `"to be specified"` note — never invented
- Estimated values (typography scale from heading height) carry an explicit `"approximate — confirm with designer"` comment
- The screen flow map is incomplete by design when screenshots are sparse; open questions go into `navigation-questions.md` for the pod
- Mermaid diagram always paired with a text alternative (per `common/content-validation.md`)

## Tier-Specific Behavior

- **Greenfield**: full color/typography extraction across every screenshot; rich navigation question set
- **Feature**: scoped to the screenshots that match the feature
- **Bugfix**: skip (Design Intake itself is usually skipped at Bugfix Tier)

## Failure modes

- **Listed file missing in uploads/**: log + ask the user to upload or correct the list
- **Image unreadable (corrupt / unsupported format)**: log + ask for a re-upload
- **No brand-guide screenshot provided**: branding.md voice/tone section marked "Not provided"

## See Also

- Upstream skill: `./upstream/SKILL.md` (anthropics/skills frontend-design adapted for screenshot input)
- AI-DLC stage rule: `../../aidlc-rule-details/inception/design-intake.md`
- Sibling alternative: `../figma-mcp-extractor/SKILL.md` (path A)
- Compliance hooks: extensions/accessibility/wcag22-aa (color contrast checked when extension enabled)

## Trigger-test prompts

1. "Using AI-DLC, I uploaded the screenshots — extract the design system." (should trigger Stage 2 path B)
2. "Parse the brand colors from the home-screen.png in uploads/." (should trigger)
3. "Build the screen flow from the screenshots I dropped in." (should trigger)
4. "Connect to my Figma file at https://figma.com/..." (should NOT trigger — path A)
5. "Run the test suite." (should NOT trigger — wrong stage)
