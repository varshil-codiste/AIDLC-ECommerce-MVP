# Property-Based Testing (10 Rules)

**Extension**: PBT
**Loaded by**: Requirements Analysis when user opts in
**Enforced at**: Functional Design (Stage 8 — identify properties), NFR Requirements (Stage 9 — pick framework), Code Generation (Stage 12 — implement PBT), Code Review (Stage 13 — verify), Build & Test (Stage 14 — execute with shrinking + seed logging)

---

## Why PBT for the team

PBT generates many random inputs to find edge cases that example-based tests miss. For this workflow:
- Backend services with non-trivial business logic (validation, pricing, scheduling) benefit
- Serializers / parsers / encoders need round-trip properties
- AI/ML feature pipelines benefit from invariant properties (idempotence, bounds)
- UI form validators benefit from generators

PBT is **complementary** to example-based tests, not a replacement. Critical paths still need both.

---

## Per-Stack Framework Recommendations

| Stack | Framework | Notes |
|-------|-----------|-------|
| Frontend (TS/JS) | `fast-check` | Recommended; strong shrinking; React-friendly |
| Backend Node | `fast-check` | Same as Frontend |
| Backend Python | `Hypothesis` | De facto standard; rich strategies |
| Backend Go | `pgregory.net/rapid` (Recommended) or `gopter` | Native Go style |
| Mobile Flutter | `glados` | Dart-native; simpler shrinking than rapid |

These are picked at NFR Requirements (Stage 9) and confirmed at Stack Selection (Stage 11).

---

## The 10 Rules

### PBT-01 — Property Identification at Design Time

**Statement**: During Functional Design (Stage 8), every business rule and data transformation is evaluated for these property types:

| Property type | Example |
|---------------|---------|
| Round-trip | `decode(encode(x)) == x` |
| Invariant | sorting preserves length and multi-set; pagination preserves total |
| Idempotence | `f(f(x)) == f(x)` (e.g., normalize, dedupe) |
| Commutativity / associativity | math operations, set operations |
| Oracle / model | new optimized impl matches a known-correct slow impl |
| Induction | f(n+1) = g(f(n), n+1) |
| Easy verification | property cheap to check even when result is hard to compute |

The AI lists candidate properties in `functional-design/business-rules.md` § "Properties to test". The pod confirms which to implement.

### PBT-02 — Round-trip Properties

**Statement**: Every serialization, parsing, encoding, encryption, or persistence operation has a round-trip test.

Examples:
- JSON parse/stringify: `JSON.parse(JSON.stringify(x))` equals `x`
- Database write/read: `read(write(x))` equals `x` (modulo server-set fields)
- Encryption: `decrypt(encrypt(x, k), k)` equals `x`
- API request/response: `parse(serialize(req))` equals `req`

### PBT-03 — Invariant Properties

**Statement**: Every collection / data-structure operation has invariant tests for size, ordering, range, type, and business constraints.

Examples:
- Sort: output length equals input length, output is monotonic, output is a permutation of input
- Filter: output is a subset of input, output preserves ordering of input
- Pagination: `sum(items in each page) == total items`; no item appears in two pages
- Numeric ranges: outputs of bounded function stay in bounds

### PBT-04 — Idempotence Properties

**Statement**: Operations that should be idempotent have an explicit test asserting `f(f(x)) == f(x)`.

Targets:
- HTTP PUT / DELETE
- Cache writes
- Deduplication
- Configuration application
- Message processing (idempotency key handlers)

### PBT-05 — Oracle / Model-Based Testing

**Statement**: When an optimized implementation replaces a slow but obviously-correct one, run both against the same generated inputs and assert equality.

Examples:
- Custom-tuned algorithm vs naive baseline
- New cache impl vs always-miss reference
- Database query rewrite: old vs new query

### PBT-06 — Stateful Property Testing

**Statement**: Stateful systems are tested by generating random *sequences of operations* and checking invariants after each.

Targets:
- Caches with TTL / LRU
- State machines (orders, subscriptions, sessions)
- Queues with retry / DLQ
- Shopping carts / checkout flows
- Mobile app state (Riverpod / BLoC stores)

Frameworks support stateful PBT: `fast-check` `commands`, Hypothesis `RuleBasedStateMachine`, rapid `Machine`, glados (combinator API).

### PBT-07 — Generator Quality

**Statement**: Generators produce realistic, bounded, edge-aware inputs.

Quality criteria:
- Generators for **domain types** (e.g., `genUserEmail`, `genISODate`) live next to the domain types — not duplicated per test
- Constrained primitives: emails match a real regex; integers respect business bounds
- Structured types: nested objects use shared sub-generators
- Edge cases: empty / null / unicode / max-length / negative / zero / very-large explicitly included via biases or extra examples

### PBT-08 — Shrinking and Reproducibility

**Statement**: When a test fails, the framework shrinks to a minimal counter-example AND the seed is logged so the failure can be reproduced.

- Use the framework's built-in shrinking — do NOT disable
- Log the seed (and raw counter-example) on failure
- CI captures the seed in the failure artifact
- Add the failing seed as a regression example: `fc.assert(prop, { examples: [...known-bads] })` (or framework equivalent)

### PBT-09 — Framework Selection (per the team's table above)

**Statement**: Use the recommended PBT framework for the stack. Don't invent custom test runners.

If a different framework is chosen via Block A.4 / etc. or Question X) Other in the opt-in, justify it in `audit.md`.

### PBT-10 — Complementary Testing

**Statement**: PBT does NOT replace example-based tests for critical paths. Each critical flow has BOTH:
- A handful of named, deterministic example tests (auditable by humans)
- A property-based test that explores many random inputs

Example-only is fine for trivial flows. PBT-only is never fine for critical flows.

---

## Partial Mode (Question B in opt-in)

If user answered `B) Partial` to opt-in, only these rules are blocking:

- PBT-02 (round-trip)
- PBT-03 (invariant)
- PBT-07 (generator quality)
- PBT-08 (shrinking + reproducibility)
- PBT-09 (framework selection)

PBT-01, 04, 05, 06, 10 become advisory in partial mode — the AI still suggests them but does not block.

---

## Stage-by-Stage Application

| Stage | What this extension does |
|-------|--------------------------|
| 8 Functional Design | PBT-01: identify candidate properties; record in business-rules.md |
| 9 NFR Requirements | Confirm framework selection (matches table above) |
| 12 Code Generation | Generate property tests alongside source per identified properties |
| 13 Code Review | Verify each identified property has a corresponding test; verify shrinking + seed logging |
| 14 Build & Test | Run PBT suite; if fails, log seed + shrunk counter-example |

---

## Anti-patterns

- ❌ PBT replacing example-based tests for critical flows
- ❌ Generators that don't cover edge cases (always-positive numbers, always-non-empty strings)
- ❌ Disabling shrinking because it's "slow" — this hides the actual failure
- ❌ Generators duplicated across test files instead of shared
- ❌ Dropping seeds on failure — without seed, the failure is unreproducible
