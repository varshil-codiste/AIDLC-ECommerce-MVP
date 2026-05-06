---
name: figma-mcp-extractor
description: |
  Use when the user chose path A (Figma MCP) at AI-DLC Stage 2 (Design Intake). Connects to a configured Figma MCP server, fetches the named file's frames, design variables, and frame-to-frame prototype links, and writes the team's three canonical design artifacts: branding.md, design-tokens.md (W3C Design Tokens format), and screen-flow-map.md (Mermaid navigation graph + text alternative). Refuses to run if no Figma MCP server is configured; in that case the workflow falls back to screenshot-design-parser.
aidlc:
  sensitive: false
---

# Figma MCP Extractor

## When to Use (AI-DLC context)

This skill fires at **Stage 2 — Design Intake** (`../../aidlc-rule-details/inception/design-intake.md`) Step 2A, when the user has answered "A) Connect Figma MCP" to the design-intake question file. It is the alternative to `screenshot-design-parser` (path B) and is skipped entirely on path C (skip).

The skill verifies a Figma MCP server is configured in the IDE; if not, it logs a clear error in `audit.md` and signals the workflow to either re-prompt or fall back to screenshots.

## What It Does

1. Verifies the Figma MCP server is configured (checks IDE MCP config)
2. Fetches each Figma file URL provided in the design-intake-questions.md answers
3. Pulls per file: top-level frames, design variables/styles, image previews, frame-to-frame prototype links
4. Synthesizes the three the three canonical design artifacts

## Inputs

- `aidlc-docs/inception/design/design-intake-questions.md` (answer to Q1=A; Q2 = Figma URL list)
- IDE MCP configuration (e.g., `~/.claude/mcp.json` or equivalent)

## Outputs

- `aidlc-docs/inception/design/figma-export/<file-id>/` (raw extracts: frames.json, variables.json, frame-previews/*.png)
- `aidlc-docs/inception/design/branding.md` (logo, brand colors, voice/tone if discoverable)
- `aidlc-docs/inception/design/design-tokens.md` (W3C Design Tokens Format Module: color, font, space, radius, shadow)
- `aidlc-docs/inception/design/screen-flow-map.md` (Mermaid `flowchart LR` + text alternative; lists open questions for ambiguous frames)

## Governance

- **Free-roam invocation**: pre-invocation entry in audit.md must include the Figma file ID being read
- **Sensitive flag**: no (read-only access to Figma)
- **Tier scope**: Greenfield, Feature (only when FE or Mobile is in scope; auto-skip otherwise)

## Team Conventions Applied

- Tokens emitted in W3C Design Tokens Format (so they can be re-exported to Tailwind / Style Dictionary / Flutter ThemeData)
- Token names that the source doesn't provide are emitted as `null` with a `"to be specified"` comment — never invented
- Frame names that don't follow recognizable conventions surface as open questions in screen-flow-map.md (the AI does not silently guess at navigation)
- The Mermaid diagram is always paired with a plain-text alternative (per `common/content-validation.md`)
- If voice/tone content isn't in the Figma file, branding.md marks the section "Not provided — to be defined by Marketing or Stakeholder before launch"

## Tier-Specific Behavior

- **Greenfield**: full extraction across every frame; populate every section of branding/tokens/screen-flow even if some are sparse
- **Feature**: extract only frames the user pointed at (Q2 answer typically scopes to specific pages/screens)
- **Bugfix**: skip (Design Intake itself is usually skipped at Bugfix Tier)

## Failure modes

- **Figma MCP not configured**: log error in audit.md, post a question file `figma-mcp-not-configured.md` offering: install MCP, or fall back to screenshots (path B), or skip (path C)
- **Figma URL unreachable / private**: log error, ask for a different URL or fall back
- **File empty or no frames**: log error, ask for the correct file or fall back

## See Also

- Upstream skill: `./upstream/SKILL.md` (anthropics/skills frontend-design + custom Figma MCP wrapper)
- AI-DLC stage rule: `../../aidlc-rule-details/inception/design-intake.md`
- Sibling alternative: `../screenshot-design-parser/SKILL.md` (path B)
- Compliance hooks: extensions/accessibility/wcag22-aa (when enabled — output color tokens checked for AA contrast)

## Trigger-test prompts

1. "Using AI-DLC, here's our Figma file: https://figma.com/file/abc123" (should trigger Stage 2 path A)
2. "I picked option A in design-intake-questions.md — pull the design system from Figma." (should trigger)
3. "Extract design tokens from our Figma." (should trigger)
4. "Use the screenshots in inception/design/uploads instead." (should NOT trigger — that's path B)
5. "Generate the deployment Dockerfile." (should NOT trigger — wrong stage)
