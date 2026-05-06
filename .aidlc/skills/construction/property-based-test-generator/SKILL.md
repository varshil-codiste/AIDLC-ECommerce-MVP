---
name: property-based-test-generator
description: |
  Use when generating property-based tests at AI-DLC Stage 12 for any UoW where the Property-Based Testing extension is enabled. Reads the candidate properties identified at Functional Design (PBT-01) and emits suites using the per-stack framework (fast-check for TS/JS, Hypothesis for Python, pgregory.net/rapid for Go, glados for Dart) per the PBT extension rule file. Generates round-trip (PBT-02), invariant (PBT-03), idempotence (PBT-04), and stateful (PBT-06) properties with shrinking + seed-based replay enabled by default.
aidlc:
  sensitive: false
---

# Property-Based Test Generator

## When to Use (AI-DLC context)

This skill fires at **Stage 12 — Code Generation** when the **Property-Based Testing extension is enabled** in `aidlc-state.md § Extension Configuration`. It runs alongside the per-stack code-conventions skills (#6–#10) — those skills generate source + example-based tests; this one adds property-based tests for any property identified at Functional Design.

## What It Does

For each property listed in `business-rules.md § Properties to test`:

1. Picks the right framework per stack:
   - TypeScript / JavaScript → `fast-check`
   - Python → `Hypothesis`
   - Go → `pgregory.net/rapid` (Recommended) or `gopter`
   - Dart / Flutter → `glados`
2. Generates a `*.pbt.test.<ext>` file per property with appropriate generators (PBT-07 quality criteria)
3. Configures shrinking ON (PBT-08) and seed logging on failure
4. Adds the failing seed as a regression example automatically when a flake is detected
5. For stateful properties (PBT-06 — caches, queues, state machines), generates command-sequence tests using the framework's stateful API (`fast-check` `commands`, Hypothesis `RuleBasedStateMachine`, rapid `Machine`, glados combinator API)
6. Writes a `<unit>-pbt-properties.md` summary listing every property generated and its category (round-trip / invariant / idempotence / oracle / stateful)

## Inputs

- `aidlc-docs/construction/{unit}/functional-design/business-rules.md` § "Properties to test" (PBT-01 output)
- `aidlc-docs/construction/{unit}/stack-selection/stack-selection.md`
- `aidlc-docs/aidlc-state.md` (verifies Extension Configuration: Property-Based Testing = true)
- `../../aidlc-rule-details/extensions/testing/property-based/property-based-testing.md` (rule file — opt-in mode determines Partial vs Full)

## Outputs

Source-tree test files following each stack's test layout:
- TS/JS: `<src>/<feature>.pbt.test.ts` (Vitest) or `<feature>.pbt.spec.ts` (Jest)
- Python: `tests/unit/test_<feature>_pbt.py`
- Go: `<feature>_pbt_test.go` (next to source, Go convention)
- Dart: `test/unit/<feature>_pbt_test.dart`

Plus `aidlc-docs/construction/{unit}/code/<unit>-pbt-properties.md` (summary).

## Governance

- **Free-roam invocation**: standard audit.md entries; the extension-enabled check is performed before generation
- **Sensitive flag**: no
- **Tier scope**: All (PBT extension can apply at any Tier — Bugfix scoped to changed-file properties only)

## Team Conventions Applied

- **Generators live next to domain types** (e.g., `genUserEmail`, `genISODate`) — never duplicated across test files
- **Bounded primitives**: emails match a real regex, integers respect business bounds, strings have realistic max length
- **Edge cases included**: empty / null / unicode / max-length / negative / zero / very-large via biased generators
- **Shrinking ON, seeds logged on failure** (PBT-08); failing seeds become regression examples (`fc.assert(prop, { examples: [seed] })`)
- **PBT does NOT replace example-based tests** for critical paths (PBT-10) — both ship together
- **Partial mode (PBT extension Question B)**: only PBT-02, -03, -07, -08, -09 enforced; PBT-01, -04, -05, -06, -10 advisory and skipped

## Tier-Specific Behavior

- **Greenfield**: full PBT coverage on every identified property; stateful tests for any state-machine component
- **Feature**: scope to properties of the new feature; existing PBT untouched
- **Bugfix**: scope to properties of the affected unit only; if no property maps to the bug, generate a regression example test instead

## See Also

- Upstream skill: `./upstream/README.md` (trailofbits/property-based-testing)
- AI-DLC extension rule: `../../aidlc-rule-details/extensions/testing/property-based/property-based-testing.md`
- Stage rule: `../../aidlc-rule-details/construction/code-generation.md`
- Compliance hooks: extension is Property-Based Testing itself; no nested extension dependencies

## Trigger-test prompts

1. "Using AI-DLC, generate property-based tests for the round-trip serialization in the orders UoW." (should trigger when PBT extension enabled)
2. "Add Hypothesis tests for the pricing calculator's invariants." (should trigger if BE Python in scope)
3. "Build fast-check stateful tests for the cart state machine." (should trigger if FE/BE-Node)
4. "Run the existing PBT suite." (should NOT trigger — that's test-runner-aggregator)
5. "Generate API contract." (should NOT trigger — wrong stage)
