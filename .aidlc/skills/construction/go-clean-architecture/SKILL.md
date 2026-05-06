---
name: go-clean-architecture
description: |
  Use when generating Go backend code at AI-DLC Stage 12 (Code Generation) for any UoW where Backend Go was chosen at Stack Selection Block D. Enforces the cmd/ + internal/ + pkg/ clean architecture layout, the chosen HTTP layer (stdlib + chi/echo / Gin / Fiber / Echo per Block D.1), error wrapping with fmt.Errorf("...: %w", err), context.Context propagation, log/slog JSON handler with required fields, and golangci-lint clean output. Skips when the UoW doesn't use Backend Go.
aidlc:
  sensitive: false
---

# Go Clean Architecture

## When to Use (AI-DLC context)

This skill fires at **Stage 12 — Code Generation** for any UoW with Backend Go in scope (per `unit-of-work.md § Stacks involved` and Stack Selection Block D).

It generates idiomatic Go code following the team's `go-conventions.md`, layered cleanly so that swapping the HTTP layer or DB driver later is a small change.

## What It Does

For each backend feature in the UoW:

1. Generates the directory structure: `cmd/<service>/main.go`, `internal/api/<feature>_handler.go`, `internal/service/<feature>_service.go`, `internal/repository/<feature>_repository.go`, `internal/domain/` (entities, errors, value types), `internal/platform/` (logger, db, http server)
2. Wires the chosen HTTP layer (stdlib + chi/echo Recommended, or Gin / Fiber / Echo per Block D.1) — `chi.Router` with middleware via `r.Use`, sub-routers via `r.Route`
3. Defines `internal/domain/errors.go` with `AppError{Code, HTTPStatus, UserMsg, Cause}` + `Error()` + `Unwrap()`
4. Configures global error handler mapping `AppError` → problem+json (Content-Type `application/problem+json`)
5. Sets up `log/slog` JSON handler emitting required fields (time, level, msg, request_id, user_id, service, version)
6. Adds a request-ID middleware that injects `*slog.Logger` into context
7. Authors `_test.go` files next to source (Go convention) using stdlib `testing` + `testify/require` + `gomock` for mocks; table-driven tests preferred
8. Configures `go.mod`, `go.sum`, `golangci-lint` config with required checkers (errcheck, gosimple, govet, ineffassign, staticcheck, unused, gosec, revive, nilerr, prealloc)

## Inputs

- `aidlc-docs/construction/{unit}/functional-design/business-logic-model.md`
- `aidlc-docs/construction/{unit}/functional-design/business-rules.md`
- `aidlc-docs/construction/{unit}/functional-design/domain-entities.md`
- `aidlc-docs/construction/{unit}/stack-selection/stack-selection.md` (Block D)
- `aidlc-docs/construction/{unit}/nfr-design/nfr-design-patterns.md`
- `<workspace-root>/shared/openapi.yaml` or `*.proto` (if api-contract-designer ran first)

## Outputs

Source code under the workspace root (NEVER under `aidlc-docs/`) following the clean-architecture layout in `go-conventions.md`:

```
cmd/<service>/main.go
internal/
├── api/<feature>_handler.go      + _test.go
├── service/<feature>_service.go  + _test.go
├── repository/<feature>_repository.go + _test.go
├── domain/
├── config/
├── middleware/
└── platform/
migrations/
go.mod
go.sum
.golangci.yml
Makefile
```

Plus the code-summary entry in `<unit>-code-summary.md`.

## Governance

- **Free-roam invocation**: standard audit.md entries
- **Sensitive flag**: no
- **Tier scope**: Greenfield, Feature; rare on Bugfix

## Team Conventions Applied

- **Errors wrapped, never ignored**: `fmt.Errorf("...: %w", err)`; `_ = something()` requires a justification comment
- **Context propagation**: every blocking call accepts `ctx context.Context`; goroutines launched in handlers respect cancellation
- **Race detector clean**: `go test ./... -race -cover` is mandatory at Code Review
- **No global state** for non-config (no package-level mutable vars)
- **No `panic`** outside truly unrecoverable initialization
- **`interface{}` / `any`** rejected when a typed parameter works
- **Argon2id for passwords** (`golang.org/x/crypto/argon2`); RS256/ES256 for JWTs
- **No raw SQL string concatenation** — parameterized queries only (`sqlx` / `pgx`)
- **`gofmt -l . | (! read)`** is mandatory at lint time (no formatting violations)
- **Goimports grouping**: stdlib / third-party / internal — alphabetical within each group
- **Repository pattern** isolates DB; services depend on repository interfaces (`gomock` generates mocks)

## Tier-Specific Behavior

- **Greenfield**: full clean-architecture scaffolding, full test coverage with table-driven tests, full middleware stack
- **Feature**: scope to the new feature(s); reuse existing platform/middleware
- **Bugfix**: surgical change in the affected file; preserve everything else; race detector run mandatory regardless of Tier

## See Also

- Upstream skill: `./upstream/README.md` (locally-authored: no single canonical upstream covers Go clean architecture; references trailofbits security patterns and getsentry/sentry-go-sdk for instrumentation)
- AI-DLC stage rule: `../../aidlc-rule-details/construction/code-generation.md`
- Stack convention: `../../aidlc-rule-details/construction/stacks/go-conventions.md`
- Stack Selection: `../../aidlc-rule-details/construction/stack-selection.md` Block D
- Compliance hooks: extensions/security/baseline (SECURITY-05 input validation, SECURITY-08 access control, SECURITY-15 fail-safe defaults), extensions/testing/property-based (uses pgregory.net/rapid for PBT when extension enabled)

## Trigger-test prompts

1. "Using AI-DLC, scaffold the recommendations service in Go with chi router." (should trigger Stage 12 BE Go)
2. "Generate the orders handler/service/repository in Go." (should trigger)
3. "Build the auth-token validation handler in Go using Gin." (should trigger)
4. "Create the FastAPI app for the same service." (should NOT trigger — wrong stack)
5. "Run integration tests." (should NOT trigger — that's test-runner-aggregator)
