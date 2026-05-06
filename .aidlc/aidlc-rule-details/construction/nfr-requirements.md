# NFR Requirements

**Stage**: 9 (conditional, per-UoW)
**Purpose**: Capture non-functional requirements (performance, security, scalability, reliability, observability, usability, AI/ML quality) for ONE Unit of Work, and feed downstream NFR Design and Stack Selection.

---

## When to Execute

**Execute IF** (any):
- Performance requirements exist
- Security considerations needed
- Scalability constraints present
- AI/ML extension is enabled (always run for LLM apps)
- Greenfield Tier (default execute)

**Skip IF**:
- No NFR concerns; existing infrastructure already meets all NFRs unchanged
- Pure UI copy / lint / typo fix

---

## Question Categories

Use multiple-choice question file with the following categories. Skip a category only if clearly N/A.

| Category | Sample questions |
|----------|------------------|
| **Performance** | p50/p95/p99 latency targets; throughput target; payload sizes; cold-start tolerance |
| **Scalability** | concurrent users; data growth rate; horizontal vs vertical scaling preference |
| **Availability** | SLO target (99.5% / 99.9% / 99.95%); maintenance window tolerance; multi-region? |
| **Security** | data classification; auth method (handed up from Application Design); encryption at rest target |
| **Reliability** | retry policy; idempotency requirements; data durability target |
| **Observability** | logs verbosity; metrics required; tracing required; alerting SLOs |
| **Maintainability** | test coverage minimum; cyclomatic complexity ceiling; dependency churn tolerance |
| **Usability** | accessibility target (handed up if Accessibility extension on); response time perception thresholds; offline mode? |
| **AI/ML Quality** (only if AI/ML extension on) | eval set + thresholds; latency-per-token target; hallucination tolerance; PII handling; prompt versioning policy |

---

## Two-Part Pattern

**Plan → Generate**.

Part 1: generate `{unit}-nfr-requirements-plan.md` + `{unit}-nfr-requirements-questions.md`. Wait for answers. Validate.

Part 2: produce these artifacts under `aidlc-docs/construction/{unit}/nfr-requirements/`.

### `{unit}-nfr-requirements.md`

```markdown
# NFR Requirements — <unit>

**UoW**: <name>
**Tier**: <…>
**Generated at**: <ISO>

## Performance
| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-PERF-001 | API endpoint p95 latency | ≤ 250 ms | observed in prod over 7-day window |
| ... | ... | ... | ... |

## Scalability
| ID | Requirement | Target |
|----|-------------|--------|
| NFR-SCAL-001 | Concurrent users at launch | 1,000 |
| NFR-SCAL-002 | 12-month growth tolerance | 10x without re-architecture |

## Availability
| ID | Requirement | Target |
|----|-------------|--------|
| NFR-AVAIL-001 | Uptime SLO | 99.9% rolling 30 days |

## Security
| ID | Requirement | Target |
|----|-------------|--------|
| NFR-SEC-001 | Data at rest encryption | AES-256 |
| NFR-SEC-002 | Auth method | <…> |

## Reliability
…

## Observability
- **Logs**: structured JSON, severity-labeled, request-ID correlated
- **Metrics**: <list — e.g., RED for HTTP, USE for queues>
- **Tracing**: <required / not required>
- **Alerts**: <list>

## Maintainability
- **Test coverage minimum**: <e.g., 80% line coverage>
- **Lint config**: enforced in CI

## Usability
- **Accessibility**: <e.g., WCAG 2.2 AA — if Accessibility extension on>
- **Perceived response time**: < 100ms for input feedback

## AI/ML Quality (only if AI/ML extension on)
- **Eval set**: <reference path>
- **Thresholds**: <e.g., golden-set pass rate ≥ 0.95>
- **Hallucination tolerance**: <e.g., grounded-rate ≥ 0.98 on RAG queries>
- **Latency-per-token**: <target>
- **PII handling**: <inputs scrubbed before LLM call; outputs scanned for echoed PII>
```

### `{unit}-tech-stack-decisions.md`

Pre-decision; full Stack Selection happens in Stage 11. Here we capture tech-stack constraints implied by NFRs:

```markdown
# Tech Stack Decisions (constraints) — <unit>

**Constraints implied by NFR**:
- Performance NFR-PERF-001 (p95 ≤ 250ms) implies: avoid stacks with cold-start > 500ms (rules out some serverless options)
- Scalability NFR-SCAL-002 (10x growth) implies: horizontal scaling required; choose stateless services
- Availability NFR-AVAIL-001 (99.9%) implies: multi-AZ deployment; database with HA option
- AI/ML latency-per-token implies: streaming-capable LLM client library

**Open choices** (decided in Stage 11 Stack Selection):
- Node.js framework: <NestJS | Express | Fastify | Other>
- Python framework: <FastAPI | Django | Flask | Other>
- Go framework: <stdlib+chi | Gin | Fiber | Other>
- Mobile state mgmt: <Riverpod | BLoC | Provider | Other>
- FE framework: <React | Next.js | Vue | Other>
```

---

### Step 3: Stage Checklist

`{unit}-nfr-requirements-checklist.md`:
- [ ] Every NFR has an ID, requirement, target, measurement
- [ ] Every NFR is traceable to a Functional Design rule or BR statement
- [ ] AI/ML quality section is present iff AI/ML extension is enabled
- [ ] Tech stack constraints derived from NFRs

### Step 4: Completion Message

```markdown
# NFR Requirements — <unit> — Complete ✅

- **NFRs captured**: <n>
- **Categories covered**: <list>

> **🚀 WHAT'S NEXT?**
>
> 🔧 **Request Changes**
> ✅ **Continue to Next Stage** — proceed to NFR Design (Stage 10)
```

---

## Anti-patterns

- ❌ "Performance must be good" — every NFR needs a numeric target
- ❌ Skipping observability category — the team's projects must be debuggable
- ❌ AI/ML extension enabled but no AI/ML quality section
- ❌ Setting NFRs that contradict the cloud target (e.g., 99.99% on a single-region deploy)
