# Go Backend Conventions

**Loaded by**: `construction/stack-selection.md` when Backend Go is in scope for a UoW.
**Applies to**: stdlib + chi/echo / Gin / Fiber / Echo per Block D.1.

---

## Project Layout (Recommended: Clean Architecture)

```
<service-root>/
├── go.mod
├── go.sum
├── cmd/
│   └── <service>/
│       └── main.go
├── internal/
│   ├── api/                    # HTTP handlers / routes (transport layer)
│   │   ├── <feature>_handler.go
│   │   └── <feature>_handler_test.go
│   ├── service/                # Business logic
│   │   ├── <feature>_service.go
│   │   └── <feature>_service_test.go
│   ├── repository/             # Data access
│   │   ├── <feature>_repository.go
│   │   └── <feature>_repository_test.go
│   ├── domain/                 # Entities, errors, value types
│   ├── config/
│   ├── middleware/
│   └── platform/               # cross-cutting (logger, db, http server)
├── pkg/                        # Public packages — only if reused by other services
├── migrations/
├── test/
│   ├── integration/
│   └── e2e/
├── Dockerfile
├── Makefile
└── .env.example
```

**Why `internal/`**: prevents external imports; keeps the service's API minimal.
**Why `pkg/`**: only for genuinely reusable packages — never default to `pkg/` for service-internal code.

### Flat layout (simpler / single binary)
```
<service-root>/
├── go.mod
├── main.go
├── handlers/
├── services/
├── repository/
└── domain/
```

Acceptable for very small services or libraries; clean architecture preferred for growing services.

---

## Lint / Format / Vet

| Tool | Team rule |
|------|--------------|
| `gofmt -l` | MUST output empty (no formatting violations) |
| `goimports` | run on save; alphabetical, grouped by std / third-party / internal |
| `go vet ./...` | MUST pass |
| `golangci-lint` | enable: `errcheck`, `gosimple`, `govet`, `ineffassign`, `staticcheck`, `unused`, `gosec`, `revive`, `nilerr`, `prealloc` |

**`go test ./... -race -cover` MUST pass with race detector clean.**

---

## Testing

| Concern | Convention |
|---------|------------|
| Framework | stdlib `testing`; `testify/assert` and `testify/require` for ergonomics |
| Mocks | `gomock` (Recommended) or hand-written interfaces |
| Table-driven tests | Strongly preferred for unit tests |
| Integration tests | `_test.go` files with `// +build integration` tag; run via `go test -tags=integration` |
| Coverage target | 80% line (greenfield) |
| Property-based tests (PBT extension on) | `pgregory.net/rapid` |

Test files live next to source files (Go convention).

---

## HTTP / Routing

| Choice | Convention |
|--------|-----------|
| stdlib + chi (Recommended) | Use `chi.Router`; middleware via `r.Use`; sub-routers via `r.Route` |
| Gin | Define a single `*gin.Engine`; group routes by feature |
| Echo | Define a single `*echo.Echo`; group routes by feature |
| Fiber | Single `*fiber.App`; group routes by feature |

Handlers MUST:
- Validate request via dedicated input struct + validator (e.g., go-playground/validator)
- Return errors via centralized error handler
- Set `Content-Type: application/problem+json` on errors

---

## Error Handling

```go
// internal/domain/errors.go
type AppError struct {
    Code       string
    HTTPStatus int
    UserMsg    string
    Cause      error
}

func (e *AppError) Error() string { /* ... */ }
func (e *AppError) Unwrap() error { return e.Cause }
```

- Wrap errors with `fmt.Errorf("...: %w", err)` to preserve cause
- NEVER ignore errors — `_ = something()` requires a comment justifying it
- HTTP layer maps AppError → problem+json; unknown errors → 500 + log

---

## Logging

- **Library**: `log/slog` (stdlib, Go 1.21+) — Recommended
- **Format**: JSON via `slog.NewJSONHandler`
- **Context**: pass `*slog.Logger` via `context.Context` or struct field — not global
- Required fields: `time`, `level`, `msg`, `request_id`, `user_id`, `service`, `version`

---

## Database

- Use `sqlx` or `pgx` for Postgres (preferred); `sql.DB` directly is fine
- Migrations via `golang-migrate` or `goose`
- Connection pool tuned via env (max-open, max-idle, conn-lifetime)
- ORMs (GORM, ent) acceptable but second-class — prefer raw SQL or sqlx for clarity

---

## Concurrency

- Use `context.Context` for cancellation — every blocking call accepts it
- Goroutines launched in handlers MUST respect request cancellation
- Long-running goroutines launched at startup MUST have an explicit shutdown path
- Use `errgroup` for fan-out fan-in patterns
- No data races — `go test -race` clean is mandatory

---

## Security

- Hash passwords with `argon2id` (Recommended) — `golang.org/x/crypto/argon2`
- JWTs via `golang-jwt/jwt/v5`; RS256 / ES256
- SQL injection: only parameterized queries; never `fmt.Sprintf` into SQL
- Secrets via env (e.g., via `caarlos0/env`); never committed
- Rate limiting via middleware (chi has `httprate`)

---

## Anti-patterns

- ❌ Ignoring errors with `_`
- ❌ Naked returns in long functions
- ❌ Global state (vars at package level for non-config)
- ❌ Panics in non-recovery code paths (panic only for truly unrecoverable initialization failure)
- ❌ Using `interface{}` (or `any`) where a typed parameter works
- ❌ Goroutines without context cancellation
- ❌ Skipping `go test -race` because it's "slow"
