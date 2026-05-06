# Design Intake — Skipped

**Skipped at**: 2026-05-04T00:11:00Z
**Reason** (Q4 answer): **A — Design will be done later; code first**. Iterate the visual layer once core flows work.

## Context

Round 1 Q7 in BR Intake said brand assets are *ready*. The pod has elected to defer supplying them until later — likely revisited at Stage 6 (Application Design) or Stage 8 (Functional Design per FE UoW), once the team has working flows to apply branding to.

## What this means for downstream stages

Downstream stages will produce **design-agnostic placeholders**:

- **Application Design (Stage 6)**: FE component tree will use generic component names (e.g., `ProductCard`, `CartSummary`, `OrderTracker`) without specific brand styling
- **Functional Design (Stage 8, per FE UoW)**: screen specs will reference placeholder copy and neutral component names
- **Code Generation (Stage 12)**: FE/Mobile UoWs will use the chosen framework's defaults — i.e., **shadcn/ui defaults for React** (per codiste preset frontend recommendation), neutral typography scale, system color palette. Branding can be layered in later via design tokens.

## Trigger to revisit

The pod may revisit Design Intake at any time per `common/workflow-changes.md` § Adding a Skipped Stage. Likely revisit moment: when brand assets are dropped into the repo or a Figma file becomes available — at which point we run Design Intake retroactively and update generated FE/Mobile artifacts.
