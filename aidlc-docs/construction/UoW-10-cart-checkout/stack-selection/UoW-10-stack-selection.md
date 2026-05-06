# Stack Selection — UoW-10 (Cart + Checkout Agents)

**Stage**: 11 — Stack Selection
**Tier**: Greenfield (Comprehensive)
**Profile**: codiste preset (locked at Stage 11/UoW-01)
**Generated at**: 2026-05-06T11:25:00Z
**Mode**: **Brownfield inheritance — zero new packages**

---

## Confirmation Pass

UoW-10 implements Cart + Checkout agents using only services already available in the codebase. No new runtime dependencies. No DB migrations.

### Inherited (no change)

| Layer | Choice | Source UoW |
|-------|--------|-----------|
| API framework | NestJS 11 | UoW-01 |
| ORM | Prisma 6 (multiSchema) | UoW-01/03 |
| Database | PostgreSQL 16 (app schema) | UoW-01 |
| Auth | JWT via `@nestjs/passport` | UoW-02 |
| LLM provider | OpenAI via `openai` 6.36 | UoW-04 |
| Redis | ioredis 5.4 | UoW-03 |
| Scheduling | `@nestjs/schedule` | UoW-03 |
| FE framework | Next.js 15 + React 19 | UoW-05 |
| Schema validation | AJV 8 | UoW-05 |
| Testing (BE) | Vitest + fast-check 3.22 | UoW-01/07 |
| Testing (FE) | Vitest + @testing-library/react + fast-check 3.22 | UoW-05 |

### DB models (brownfield — no migrations)

| Model | Source | UoW-10 usage |
|-------|--------|--------------|
| `Cart` | UoW-01/03 schema | open cart per user |
| `CartItem` | UoW-01/03 schema | line items |
| `Address` | UoW-02/03 schema | shipping address lookup at checkout |
| `ProductVariant` | UoW-03 schema | stock check + pricing |
| `Order` + `OrderItem` | UoW-08 schema | created at checkout |

---

## Block A — Confirmed Choices

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Cart storage | Prisma DB (`carts` + `cart_items` tables) | Required for SH-06 cross-session persistence; already in schema |
| One-open-cart enforcement | Partial unique index `carts_user_open_idx` (pre-existing) | DB-level guarantee; no app-level lock needed |
| Stock check | Optimistic at add + definitive in `$transaction` at checkout | MVP-scale acceptable; TOCTOU handled at checkout (NFR-10-SEC-04) |
| `checkout_create_order` | Prisma `$transaction` (5 ops) | Atomic: no half-created orders |
| Simulated payment | Pure synchronous no-op `simulatePayment()` | No external dep; swap point for real gateway |
| Prompt model | `gpt-4o` (inherited from `LlmModule`) | Same as all prior agents |
| Prompt versioning | `cart-agent.v1.0.0`, `checkout-agent.v1.0.0` | Matches established naming convention |
| Cart enrichment | Single Prisma `include` (Cart → items → variant → product) | One DB round-trip; in-process `computeTotal` |
| PBT targets | `computeTotal` pure fn + 2 schema round-trips | Matches NFR-10-PBT-01..03 |

---

## Block B — New env vars

None. All required env vars already present (`DATABASE_URL`, `REDIS_URL`, `LLM_API_KEY`, `JWT_SECRET`).

---

## Block C — Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Concurrent cart creates (two simultaneous `cart_add` for same user with no open cart) | `findFirst` → `create` path; on Prisma `P2002` (unique violation), retry `findFirst` — Pattern 1 |
| Stock race between `cart_add` and `checkout_create_order` | Two-phase validation (Pattern 3); checkout tx re-validates with row-level isolation |
| Agent skips confirmation gate on `cart_clear` | Prompt instruction + adversarial eval case A-10-02 |
| Empty address at checkout | `CheckoutService.checkoutStart` returns `address: null`; agent prompts shopper; pay button disabled |

---

## Verdict

✅ **Brownfield zero-package** — UoW-10 requires no new packages, no new migrations, no new env vars. All decisions confirmed from existing infrastructure.
