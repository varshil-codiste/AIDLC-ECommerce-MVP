# NFR Requirements — UoW-03 (Persistence + Audit Log + Idempotency + Outbox)

**UoW**: UoW-03 — Persistence + audit log + idempotency + outbox foundation  
**Tier**: Greenfield (Comprehensive)  
**Generated at**: 2026-05-05T12:00:00Z  
**Sources**: application-design/data-model.md, application-design/event-topology.md, requirements.md § 2 NFRs, UoW-03 business rules (BR-PERSIST-001 – 013)  
**Extensions active**: Security Baseline (full), PBT (partial — PBT-02, 03, 07, 08, 09), Accessibility (N/A — no UI); AI/ML = N/A (LLM ships UoW-06)

---

## 1. Performance

| ID | Requirement | Target | Measurement | Derivation |
|----|-------------|--------|-------------|------------|
| NFR-PERF-UoW03-01 | `AuditLogService.insert()` wall-clock time (within transaction) | ≤ 10 ms | pino timer, sampled 1% | Single INSERT to audit schema; no joins; local PG connection |
| NFR-PERF-UoW03-02 | `IdempotencyService.check()` latency (DB lookup) | ≤ 15 ms p95 | pino timer | Primary key lookup on `idempotency_keys.key` — should be sub-millisecond on local PG; budget includes connection checkout |
| NFR-PERF-UoW03-03 | `IdempotencyService.save()` latency (DB insert) | ≤ 15 ms p95 | pino timer | Single INSERT; same budget as check |
| NFR-PERF-UoW03-04 | Outbox drain cycle duration (100-row batch) | ≤ 500 ms per cycle | Grafana metric `outbox_drain_cycle_ms` | 100 × (XADD + UPDATE); Redis and PG are local; each op ≤ 5 ms |
| NFR-PERF-UoW03-05 | Outbox pending-row lag (steady state) | ≤ 2 s | Grafana metric `outbox_pending_rows` sampled every 5 s | Drain runs every 1 s; 2-cycle buffer acceptable |
| NFR-PERF-UoW03-06 | Prisma schema migration apply time (CI) | ≤ 30 s | GitHub Actions step duration | Full 15-table schema on empty DB; local Docker Postgres |

---

## 2. Scalability

| ID | Requirement | Target | Notes |
|----|-------------|--------|-------|
| NFR-SCAL-UoW03-01 | Audit log write rate | ≤ 50 rows/s sustained (MVP pilot scale) | At 5–10 users; no batching needed |
| NFR-SCAL-UoW03-02 | Idempotency key table size (24-hour window) | ≤ 10,000 rows at MVP | Cleanup job maintains ceiling; partial index on `created_at` for efficient sweep |
| NFR-SCAL-UoW03-03 | Outbox rows drainable per minute | ≥ 6,000 (100 rows/cycle × 60 cycles) | Far exceeds MVP event rate; headroom for M3+ burst |
| NFR-SCAL-UoW03-04 | Parallel outbox drain workers | Safe for ≥ 2 workers concurrently | `FOR UPDATE SKIP LOCKED` prevents double-drain; design tested with 1 worker in MVP |
| NFR-SCAL-UoW03-05 | Audit log table row volume (1 year) | ≤ 5 million rows at MVP pilot scale | ≤ 14 KB/row average; ~70 GB/year max — acceptable on 40 GB+ VPS volume |

---

## 3. Availability & Reliability

| ID | Requirement | Target | Notes |
|----|-------------|--------|-------|
| NFR-AVAIL-UoW03-01 | Audit log availability inherits API availability | 99.5% monthly | Same-process NestJS service; no external dependency beyond Postgres |
| NFR-RELI-UoW03-01 | Audit log write atomicity | Audit entry MUST commit in the same transaction as the domain mutation or not at all | Enforced by passing `tx` to `AuditLogService.insert()` (BR-PERSIST-002) |
| NFR-RELI-UoW03-02 | Outbox at-least-once delivery | Every domain mutation that emits an event MUST eventually publish to Redis Streams | Outbox row persists until `committed_to_stream_at` is set; drain retries on every cycle |
| NFR-RELI-UoW03-03 | Outbox drain on Redis failure | Drain worker does NOT mark row as committed; row retried next cycle | No data loss; back-pressure is bounded by drain cycle lag (NFR-PERF-UoW03-05) |
| NFR-RELI-UoW03-04 | Idempotency key replay fidelity | Replayed response MUST be byte-identical to original `response_body` stored in DB | No re-serialization; stored and returned as-is from JSONB column |
| NFR-RELI-UoW03-05 | Idempotency key cleanup does NOT block writes | Cleanup job runs outside the request path; uses a low-priority DELETE | Scheduled cron job; no impact on API p95 |
| NFR-RELI-UoW03-06 | Prisma migration deploy is idempotent | `prisma migrate deploy` on an already-migrated DB must exit 0 | Prisma built-in; enforced in CI |

---

## 4. Security

*Security Baseline extension fully enabled. All 15 SECURITY-* rules evaluated.*

| ID | Requirement | Target | Applicable rule | Notes |
|----|-------------|--------|-----------------|-------|
| NFR-SEC-UoW03-01 | DB role separation: `audit_writer_role` has INSERT only on `audit.audit_log` | Required (blocking) | SECURITY-06 | `app_role` has SELECT only; no UPDATE/DELETE granted to any app role |
| NFR-SEC-UoW03-02 | Audit log row-level trigger blocks UPDATE/DELETE from any role | Required (blocking) | SECURITY-06 | `tg_audit_log_no_update_delete` trigger raises EXCEPTION on any attempt |
| NFR-SEC-UoW03-03 | `before`/`after` JSONB snapshots in audit log must NOT include raw password hashes or secret material | Required (blocking) | SECURITY-03 | `AuditLogService` strips fields matching `['passwordHash','password_hash','jwtPrivateKey']` before serialising snapshot |
| NFR-SEC-UoW03-04 | Idempotency key values must not be logged in plaintext | Required | SECURITY-03 | Idempotency-Key header value is hashed (SHA-256) before appearing in any log line |
| NFR-SEC-UoW03-05 | `idempotency_keys.response_body` must not store tokens, passwords, or other secrets | Required | SECURITY-03 | Handler responses containing sensitive fields are scrubbed by `IdempotencyService.sanitise()` before storage |
| NFR-SEC-UoW03-06 | All SQL queries use parameterised Prisma calls; no string interpolation into queries | Required (blocking) | SECURITY-01 | Prisma ORM enforces this; raw SQL (if any) uses `$queryRaw` with tagged template literals only |
| NFR-SEC-UoW03-07 | Outbox `payload` JSONB must not contain PII fields | Required | SECURITY-03 | Event payloads carry IDs and metadata only; PII is fetched by the consumer from the DB using the entity ID |
| NFR-SEC-UoW03-08 | `AuditLogService` only accepts calls from within the API service process | N/A at MVP | SECURITY-06 | No external API surface for audit writes; enforced by NestJS module encapsulation |
| NFR-SEC-UoW03-09–15 | SECURITY rules 09–15 (rate limiting, cookie, HSTS, CSRF, supply chain, dependency scanning, secrets in git) | N/A for this UoW | — | These rules apply to HTTP endpoints and CI pipelines; UoW-03 has no new HTTP endpoints; CI already configured in UoW-01 |

---

## 5. Observability

| Category | Requirement | Detail |
|----------|-------------|--------|
| **Metrics** | `outbox_pending_rows` gauge | Polled every 5 s by drain worker; exported to Prometheus via OTel (wired in UoW-04) |
| **Metrics** | `outbox_drain_cycle_ms` histogram | Duration of each drain cycle; p95 target ≤ 500 ms (NFR-PERF-UoW03-04) |
| **Metrics** | `audit_log_insert_total` counter | Incremented on each successful audit insert; labeled by `action` |
| **Metrics** | `idempotency_hit_total` counter | Hits vs misses; labeled by `outcome` (hit / miss / fingerprint_mismatch / expired) |
| **Logs** | Structured pino JSON | All service methods emit `level=debug` on entry, `level=info` on success, `level=warn` on retry, `level=error` on failure |
| **Logs** | `request_id` field on every log line | Populated from `AsyncLocalStorage`; enables log-to-audit correlation |
| **Tracing** | OTel spans for `outbox.drain_cycle` and `idempotency.check` | Spans emitted as no-ops in UoW-03; wired to OTel SDK in UoW-04 |
| **Alerts** | `outbox_pending_rows > 500 for 2 min` | Grafana alert → email to on-call |
| **Alerts** | Drain worker process exit | Grafana container restart alert (docker compose watch) |

---

## 6. Maintainability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-MAINT-UoW03-01 | Test coverage for `AuditLogService`, `IdempotencyService`, `OutboxService`, `OutboxDrainWorker` | ≥ 80% line coverage (unit + integration combined) |
| NFR-MAINT-UoW03-02 | ESLint passes with zero warnings | Enforced in CI; same ruleset as UoW-01/02 |
| NFR-MAINT-UoW03-03 | TypeScript strict mode — zero `any` in new files | `tsconfig.json` `"strict": true` already set |
| NFR-MAINT-UoW03-04 | Prisma migration file naming convention | `<timestamp>_UoW-03-<seq>-<description>.sql` — consistent with UoW-02 naming |

---

## 7. Property-Based Testing (PBT — partial mode: PBT-02, 03, 07, 08, 09)

| ID | Requirement | Scope | PBT rule |
|----|-------------|-------|----------|
| NFR-PBT-UoW03-01 | `IdempotencyService.computeFingerprint(method, path, body)` is a pure function: same inputs always produce same output; different inputs produce different outputs (collision-free for realistic inputs) | Unit — `fast-check` property suite | PBT-02 |
| NFR-PBT-UoW03-02 | Audit log `before`/`after` snapshot serialisation round-trip: `deserialise(serialise(entity)) === entity` for all valid entity shapes | Unit — property over random entity-shaped objects | PBT-03 |
| NFR-PBT-UoW03-03 | Order status machine: no invalid transition is reachable from any valid starting state | Unit — state machine traversal property | PBT-07 |
| NFR-PBT-UoW03-04 | `OutboxService.buildPayload(eventType, data)` is pure and deterministic | Unit — same inputs → same JSONB output | PBT-02 |

---

## 8. Usability

N/A — UoW-03 is BE+DB only. No UI surface.

---

## 9. AI/ML Quality

N/A — UoW-03 has no LLM integration. AI/ML extension applies from UoW-06.
