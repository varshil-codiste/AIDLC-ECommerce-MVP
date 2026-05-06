# Node.js Backend Conventions

**Loaded by**: `construction/stack-selection.md` when Backend Node.js is in scope for a UoW.
**Applies to**: NestJS / Express / Fastify / Hono per Block B.1.

---

## Project Layout

### NestJS
```
<service-root>/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── <feature>/
│   │   ├── <feature>.controller.ts
│   │   ├── <feature>.service.ts
│   │   ├── <feature>.module.ts
│   │   ├── dto/
│   │   ├── entities/
│   │   └── <feature>.spec.ts
│   ├── common/                 # filters, pipes, interceptors
│   ├── config/
│   └── shared/                 # cross-feature utils
├── test/                       # e2e + integration tests
├── package.json
├── tsconfig.json
├── nest-cli.json
└── .env.example
```

### Express (layered)
```
<service-root>/
├── src/
│   ├── server.ts
│   ├── routes/
│   │   └── <feature>.routes.ts
│   ├── controllers/
│   │   └── <feature>.controller.ts
│   ├── services/
│   │   └── <feature>.service.ts
│   ├── repositories/
│   │   └── <feature>.repository.ts
│   ├── middleware/
│   ├── config/
│   ├── lib/
│   └── types/
├── tests/
├── package.json
├── tsconfig.json
└── .env.example
```

### Fastify (plugin)
```
<service-root>/
├── src/
│   ├── server.ts
│   ├── plugins/                # cross-cutting plugins
│   ├── modules/
│   │   └── <feature>/
│   │       ├── routes.ts
│   │       ├── service.ts
│   │       └── schema.ts       # zod / json schema
│   └── config/
├── tests/
└── package.json
```

### Hono (lightweight)
```
<service-root>/
├── src/
│   ├── index.ts
│   ├── routes/
│   ├── handlers/
│   └── middleware/
└── ...
```

---

## Lint / Format / Type-check

| Tool | Team rule |
|------|--------------|
| ESLint | flat config; extend project config; 0 errors in CI |
| Prettier | 2-space, single quotes, trailing commas |
| Biome (alt) | choose either ESLint+Prettier OR Biome — not both |
| TypeScript | `"strict": true`; `"noImplicitOverride": true`; explicit return types on exported functions |

**`tsc --noEmit` MUST pass.**

---

## Test Conventions

| Concern | Convention |
|---------|------------|
| Test framework | Vitest (Recommended) or Jest |
| Unit tests | Co-located: `<feature>.service.spec.ts` next to `<feature>.service.ts` |
| Integration tests | `test/integration/` — use Testcontainers for DB |
| e2e tests | `test/e2e/` |
| Mocking | `vi.mock` / `jest.mock`; nock or msw-node for HTTP |
| Coverage minimum | 80% line (greenfield) — configured in `vitest.config.ts` / `jest.config.js` |

---

## Validation & DTO

- **NestJS**: `class-validator` + `class-transformer`; pipes apply globally
- **Express / Fastify / Hono**: **Zod** preferred for schema validation (Recommended) — define schemas alongside route handlers; infer TS types from schemas
- Reject unknown / extra fields by default
- Return RFC 7807 problem+json on validation errors (matches application-design.md error envelope)

---

## ORM / DB

| Choice | Convention |
|--------|------------|
| Prisma | One `schema.prisma`; migrations via `prisma migrate dev`; client wrapped in a single PrismaService (NestJS) or singleton |
| Drizzle | One schema file per domain; migrations via `drizzle-kit generate`; raw SQL via `sql` template only when necessary |
| TypeORM | Entities + repositories; migrations checked into `migrations/`; do NOT use synchronize in production |

---

## Logging

- **Library**: pino (Recommended) — fast, JSON-structured
- **Format**: JSON; fields include `timestamp`, `level`, `requestId`, `userId` (if logged in), `service`, `version`
- **Levels**: error / warn / info / debug — use info for business events, debug for diagnostic
- **No `console.log` in production code**

---

## Error Handling

- All exceptions extend a base `AppError` with `code`, `httpStatus`, `userMessage`, `cause`
- Global error handler maps `AppError` → problem+json
- Unknown errors → 500 with redacted message + logged stack
- Always include `requestId` in error response

---

## Auth & Security

- Auth strategy from Application Design — implement via passport / next-auth / custom middleware
- Hash passwords with `argon2` (Recommended) or `bcrypt` (cost ≥ 12)
- JWTs signed with RS256 or ES256, never HS256 in production
- Rate limit by IP + by user — NestJS Throttler / express-rate-limit / Fastify rate-limit
- CORS configured with explicit allowed origins — never `*` in prod
- Secrets via env (loaded by `dotenv-flow` or framework primitive); secret manager in production

---

## Code Style

- One controller class per feature (NestJS) or one router per feature (Express/Fastify)
- Controllers are thin — delegate to services
- Services are pure-ish — no HTTP concerns; depend on repositories or other services
- Repositories isolate the ORM
- Avoid `any` and `as` casts
- Avoid mutable global state

---

## Anti-patterns

- ❌ Catching errors and ignoring them (`catch (e) {}`) — at minimum log
- ❌ Returning raw ORM entities to clients — use DTOs
- ❌ `console.log` in production code paths
- ❌ Hardcoding secrets / connection strings
- ❌ Mixing Express patterns with Nest patterns in one service
- ❌ Skipping the response schema (Fastify schema, NestJS DTO) — Code Review will flag
