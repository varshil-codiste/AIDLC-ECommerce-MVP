# Build & Test

**Stage**: 14 (always-execute) — runs ONCE after every UoW has passed Code Review (Gate #4)
**Purpose**: Build all units together and run **integration**, **performance**, **contract**, **e2e**, and any cross-stack tests. Per-unit unit tests already ran in Code Review (Stage 13) — Build & Test focuses on tests that need multiple units and/or the assembled artifact.

---

## Prerequisites

- Every UoW listed in `aidlc-state.md` § Unit Execution Order has Code Review COMPLETE with PROCEED verdict + pod countersign
- All conventions files loaded
- Opted-in extension rule files loaded

---

## What This Stage Covers (vs Code Review)

| Test type | Where it runs |
|-----------|---------------|
| Per-unit unit tests | Code Review (Stage 13) |
| Per-unit lint | Code Review (Stage 13) |
| Per-unit SAST + dep-scan | Code Review (Stage 13) |
| **Build** (compile / bundle / assemble all units) | Stage 14 (here) |
| **Integration tests** across UoWs | Stage 14 |
| **Contract tests** (FE-BE, BE-Mobile contract verification) | Stage 14 |
| **e2e tests** (UI through API through DB) | Stage 14 |
| **Performance tests** (load / stress / soak) | Stage 14 |
| **Accessibility** (axe / pa11y / Flutter a11y test) | Stage 14 if extension on |

---

## Execution Steps

### Step 1: Plan Build & Test

Generate `aidlc-docs/construction/build-and-test/build-and-test-plan.md` listing exactly which test commands will run and in what order. The plan adapts to Tier:

| Tier | Coverage |
|------|----------|
| Greenfield | Full: build + integration + contract + e2e + perf + a11y |
| Feature | Build + integration + contract + e2e (for affected flows); perf only if NFR requires |
| Bugfix | Build + regression test for the fix + integration tests in affected modules |

### Step 2: Generate Build Instructions

Per stack, create instructions in `build-and-test/build-instructions.md`:

```markdown
# Build Instructions

## Frontend
- Prereqs: Node ≥ 20.x, pnpm ≥ 9
- Install: `pnpm install --frozen-lockfile`
- Build: `pnpm run build`
- Output: `app/.next/` or `dist/`

## Backend Node
- Prereqs: Node ≥ 20.x
- Install: `pnpm install --frozen-lockfile`
- Build: `pnpm run build`
- Output: `dist/`

## Backend Python
- Prereqs: Python ≥ 3.12, uv installed
- Install: `uv sync --locked`
- Build: not applicable (or `uv build` if shipping a wheel)
- Output: `.venv/` ready

## Backend Go
- Prereqs: Go ≥ 1.22
- Build: `go build -o bin/<service> ./cmd/<service>`
- Output: `bin/`

## Mobile Flutter
- Prereqs: Flutter SDK pinned in `.fvmrc`
- iOS Build: `flutter build ipa --release` (requires macOS + Xcode + signing)
- Android Build: `flutter build appbundle --release`
- Output: `build/ios/` and `build/app/outputs/`
```

Run each build. Capture exit code. If any fail, log and refuse to advance.

### Step 3: Integration Tests

`integration-test-instructions.md`:

```markdown
# Integration Tests

## Frontend ↔ Backend (per FE+BE UoW)
- Spin up BE in test mode (mock external services); spin up FE pointing to BE
- Run UI integration tests covering happy paths between UoWs

## Backend ↔ Database
- Spin up Postgres in testcontainers (or named docker-compose service)
- Run repository / DAO integration tests against the real DB
- Validate migrations run cleanly forward AND backward

## Backend ↔ External Services (mocked)
- WireMock / msw / responses to mock third-party APIs
- Verify retries, breakers, fallbacks per nfr-design-patterns.md

## Service ↔ Service (microservices only)
- For UoW dependencies, run the consumer service against the producer service
- Use real binaries when feasible; mocks otherwise
```

### Step 4: Contract Tests

If the project chose OpenAPI / GraphQL / gRPC as the cross-stack contract format:

```markdown
# Contract Tests

## Producer side (BE)
- Generate OpenAPI / GraphQL schema from BE code
- Diff against `shared/contract.<format>` — must match (no drift)

## Consumer side (FE / Mobile)
- Generate typed client from `shared/contract.<format>`
- Verify the consumer compiles cleanly against the generated client
- Run consumer-side contract tests (Pact, dredd, schemathesis, etc.)
```

If contracts don't match: BLOCK; return to the UoW that owns the producer to align.

### Step 5: e2e Tests

For projects with FE or Mobile in scope:

```markdown
# e2e Tests

## Web (FE)
- Tool: Playwright (Recommended) / Cypress
- Browsers: Chromium + WebKit minimum; Firefox optional
- Tests: top-N user flows from screen-flow-map.md
- Each test asserts: navigation, key interactions, post-state

## Mobile
- Tool: Flutter integration_test / patrol
- Devices: iOS simulator latest + Android emulator API 33
- Tests: top-N flows from mobile-screens.md
```

### Step 6: Performance Tests

`performance-test-instructions.md` — only if NFR requires:

```markdown
# Performance Tests

## Load tests (BE)
- Tool: k6 (Recommended) / Gatling / JMeter
- Scenarios: synthesized from NFR-PERF-* targets
- Pass criterion: p95 latency ≤ NFR target at NFR-SCAL concurrent-user count

## Stress / soak (BE) — Greenfield only
- Tool: k6 / Locust
- Scenario: 2x design load for 30 minutes
- Pass criterion: no memory leak, error rate < 1%

## FE Lighthouse / Web Vitals
- LCP, INP, CLS thresholds per WCAG/UX baselines
- Run on a representative page set
```

### Step 7: Accessibility Tests (if Accessibility extension on)

`accessibility-test-instructions.md`:

```markdown
# Accessibility Tests

## Web
- Tool: axe-core (via @axe-core/playwright or @axe-core/react)
- Run on each critical page from screen-flow-map.md
- Pass criterion: zero WCAG 2.2 AA violations

## Mobile
- Tool: flutter test --enable-experiment=accessibility-checker
- Pass criterion: every screen passes a11y guideline checks
```

### Step 8: Cross-cutting (when applicable)

- **PBT** (if Property-Based Testing extension on): run pbt suites with seeds + shrinking enabled per `extensions/testing/property-based/property-based-testing.md`
- **AI/ML eval suite** (if AI/ML extension on): run the eval golden set per `extensions/ai-ml/lifecycle/ai-ml-lifecycle.md`

### Step 9: Generate `build-and-test-summary.md`

```markdown
# Build & Test Summary

**Generated at**: <ISO>
**Tier**: <…>

## Build Status
| Stack | Status |
|-------|--------|
| Frontend | ✅ |
| Backend Node | ✅ |
| Backend Python | ✅ |
| Backend Go | ✅ |
| Mobile Flutter | ✅ |

## Test Results
| Category | Total | Pass | Fail | Skip |
|----------|-------|------|------|------|
| Integration | <n> | <n> | <n> | <n> |
| Contract | <n> | <n> | <n> | <n> |
| e2e | <n> | <n> | <n> | <n> |
| Performance | — | NFR met / NOT met | — | — |
| Accessibility | <n> | <n> | <n> | <n> |
| PBT | <n> | <n> | <n> | <n> |
| AI/ML eval | <n> | <n> | <n> | <n> |

## Failures
<file:line:test name + error excerpt for each failure>

## NFR Compliance
| NFR ID | Target | Observed | Status |
|--------|--------|----------|--------|
| NFR-PERF-001 | p95 ≤ 250ms | p95 = 198ms | ✅ |
| NFR-AVAIL-001 | 99.9% (over soak) | 99.97% | ✅ |
| ... | ... | ... | ... |

## Overall Status
- **Passing**: <yes / no — one line>
- **Recommendation**: proceed to Operations / fix failures and re-run
```

### Step 10: Stage Checklist

`build-and-test-checklist.md`:
- [ ] Every stack built successfully
- [ ] Integration suite ran and passed (or failures explicitly accepted)
- [ ] Contract tests pass (no producer/consumer drift)
- [ ] e2e tests cover all Tier-1 stories from stories.md
- [ ] Performance tests meet every NFR-PERF-* target
- [ ] Accessibility extension findings: zero violations (if extension on)
- [ ] PBT extension: tests ran with seed logging (if extension on)
- [ ] AI/ML eval suite: passes thresholds (if extension on)
- [ ] build-and-test-summary.md generated

### Step 11: Completion Message

```markdown
# Build & Test — Complete ✅

- **Builds**: <all stacks pass / failures listed>
- **Tests**: <total pass/total fail/skip>
- **NFR compliance**: <met / not met>

> **🚀 WHAT'S NEXT?**
>
> 🔧 **Request Changes** — investigate failures
> ✅ **Continue to Next Stage** — proceed to Operations Phase (Deployment Guide, Stage 15)
```

If the overall status is "passing", the workflow proceeds to Operations. If failing, the AI returns to the affected UoW's Code Generation / Code Review.

---

## Anti-patterns

- ❌ Re-running per-unit unit tests here (already done in Code Review — wastes time)
- ❌ Skipping integration tests because "the units passed individually"
- ❌ Skipping contract tests when a contract format was chosen
- ❌ Skipping performance tests when an NFR-PERF-* target was set
- ❌ Treating Accessibility extension findings as warnings (they're blocking)
- ❌ Glossing over a single test failure as a flake without re-running 3x
