# Application Design

**Stage**: 6 (conditional)
**Purpose**: Produce a high-level full-stack architecture and component model **before** decomposing into Units of Work. team-specific: when the project is full-stack, this stage produces three coordinated architecture views (FE / BE / Mobile) plus a shared contracts view.

---

## When to Execute

**Execute IF** (any):
- New components or services needed
- Service layer / API surface needs definition
- Architectural decisions need to be made (monolith vs microservices, REST vs GraphQL, etc.)
- Greenfield Tier (default)
- Feature Tier touching architecture

**Skip IF**:
- Changes within existing component boundaries (no new components)
- Bugfix Tier (almost always)
- Pure styling / copy / config changes

---

## Prerequisites

- Stage 4 (Requirements Analysis) complete
- Stage 5 (User Stories) complete OR confirmed-skipped
- For brownfield: Stage 3 (RE) complete; reuse `architecture.md` and `component-inventory.md`

---

## Two-Part Pattern

Like Code Generation and User Stories, this stage is **Plan → Generate**.

### Part 1 — Design Planning

Create `application-design-plan.md` with checklist:
- [ ] Choose architectural style (monolith / microservices / hybrid)
- [ ] Decide deployment topology shape (single binary / multi-service / serverless)
- [ ] Decide API surface(s) (REST / GraphQL / gRPC / WebSocket / mixed)
- [ ] Decide auth strategy (session / JWT / OAuth / passwordless)
- [ ] Decide data store(s) (relational / document / k-v / graph / mixed)
- [ ] Decide cross-stack contract format (OpenAPI / GraphQL SDL / Protobuf / shared TS types)
- [ ] Identify shared cross-stack concerns (i18n, error envelope, pagination, real-time)

Generate `application-design-questions.md` covering each plan item plus follow-ups. Use multiple-choice + `X) Other`. Wait for answers and validate.

---

### Part 2 — Design Generation

Produce these artifacts under `aidlc-docs/inception/application-design/`:

#### `application-design.md` — top-level synthesis

```markdown
# Application Design

**Tier**: <…>
**Architectural style**: <Monolith | Microservices | Hybrid>
**Generated at**: <ISO>

## 1. Architecture Overview
<Mermaid component diagram showing FE / BE / Mobile / external services>

## 2. Cross-Stack Contracts
- API surface: <REST / GraphQL / gRPC>
- Schema source-of-truth: <e.g., OpenAPI in shared/openapi.yaml>
- Versioning policy: <…>
- Error envelope: <e.g., RFC 7807 problem+json>

## 3. Auth & Identity
- Auth method: <…>
- Session store: <…>
- Token lifetime: <…>

## 4. Data Stores
| Store | Purpose | Stack |
|-------|---------|-------|
| Postgres | Primary OLTP | shared by BE-Node + BE-Python |
| Redis | Cache + sessions | BE-Node |
| ... | ... | ... |

## 5. Notable Patterns
<DI containers, event bus, BFF, CQRS, etc.>

## 6. ADRs (Architecture Decision Records — optional, Comprehensive depth)
- ADR-001: Why we chose <X> over <Y>
- ADR-002: ...
```

#### `components.md` — component catalog (organized by stack)

```markdown
# Components

## Frontend (only if FE in scope)
| Component | Responsibility | Type | Notes |
|-----------|---------------|------|-------|
| AuthGuard | Route protection | wrapper | wraps route components |
| ApiClient | HTTP client | service | typed via OpenAPI codegen |
| ... | ... | ... | ... |

## Backend Node.js (only if BE-Node in scope)
| Component | Responsibility | Layer |
|-----------|---------------|-------|
| AuthController | Auth endpoints | controller |
| UserService | User business logic | service |
| ... | ... | ... |

## Backend Python (only if BE-Python in scope)
| Component | Responsibility | Layer |
|-----------|---------------|-------|
| ... | ... | ... |

## Backend Go (only if BE-Go in scope)
...

## Mobile Flutter (only if Mobile in scope)
| Component | Responsibility | Type |
|-----------|---------------|------|
| ... | ... | ... |

## Shared (shared types / schemas / utilities)
| Component | Responsibility | Stack |
|-----------|---------------|-------|
| OpenAPI codegen output | Typed API client | FE + BE |
| ... | ... | ... |
```

#### `component-methods.md` — method signatures for components named above (non-trivial only)

#### `services.md` — orchestration / domain services that coordinate components

#### `component-dependency.md` — dependency matrix + Mermaid graph showing component → component dependencies (cross-stack edges shown via dashed lines)

---

### Step 3: Stage Checklist

`application-design-checklist.md` covering: every plan item resolved, every component in `components.md` has a one-line responsibility, every cross-stack edge is justified, every ADR (if any) is dated and signed by Tech Lead.

### Step 4: Completion Message

```markdown
# Application Design — Complete ✅

- **Architectural style**: <…>
- **Stacks in scope**: <list>
- **Component count**: FE: <n>, BE: <n>, Mobile: <n>, Shared: <n>
- **Cross-stack edges**: <n>

> **🚀 WHAT'S NEXT?**
>
> 🔧 **Request Changes**
> ✅ **Continue to Next Stage** — proceed to Workflow Planning (Stage 7)
```

Wait for approval. Log in `audit.md`.

---

## Customizable Rules

1. **Full-stack coherence**: every cross-stack edge must specify the contract (e.g., "FE.AuthGuard ↔ BE-Node.AuthController via REST POST /auth/login per shared/openapi.yaml § /auth/login")
2. **Mobile considerations**: if Mobile is in scope, design must address offline mode, sync, push notifications, app-store-review constraints (deep-link configuration, sign-in-with-Apple if iOS)
3. **AI/ML projects**: if AI/ML extension is enabled, add a "## 7. AI/ML Architecture" section with: model choice, prompt registry location, eval harness placement, RAG vector store, hallucination guardrail layer
4. **Brownfield**: when modifying existing architecture, the design must explicitly preserve the components that don't change — list them under "## Preserved (no changes)"

---

## Anti-patterns

- ❌ Designing FE / BE / Mobile in isolation — full-stack means the three views must reference each other
- ❌ Choosing microservices with no operational justification (extra complexity for a 40-person team)
- ❌ Skipping cross-stack contract decisions — they leak into every UoW later
- ❌ Producing components.md without one-line responsibilities
