---
name: nestjs-conventions
description: |
  Use when generating NestJS backend code at AI-DLC Stage 12 (Code Generation) for any UoW where Backend Node.js was chosen at Stack Selection Block B.1 = NestJS. Enforces NestJS module/controller/service layout, dependency injection patterns, class-validator DTOs, global exception filters mapping AppError to RFC 7807 problem+json, pino structured logging, and the chosen ORM (Prisma/Drizzle/TypeORM per Block B.2). Skips when the UoW doesn't use Backend Node or chose Express/Fastify/Hono instead.
aidlc:
  sensitive: false
---

# NestJS Conventions

## When to Use (AI-DLC context)

This skill fires at **Stage 12 — Code Generation** (`../../aidlc-rule-details/construction/code-generation.md`) Step 5 (API Layer for BE Node), only when:
- The UoW has Backend Node.js in scope
- Stack Selection Block B.1 picked **NestJS** (the other Node options Express/Fastify/Hono are out of scope for this skill)

It generates idiomatic NestJS code following the team's `node-conventions.md`.

## What It Does

For each backend feature in the UoW:

1. Generates the feature module: `<feature>/<feature>.module.ts` + controller + service + DTOs + entities
2. Wires DTOs with `class-validator` + `class-transformer`; rejects unknown/extra fields by default
3. Wires the chosen ORM (Prisma / Drizzle / TypeORM per Block B.2) into a service or repository class
4. Configures global pipes (validation), interceptors (logging, request-ID), filters (exception → problem+json)
5. Emits structured pino logs with required fields (timestamp, level, request_id, user_id, service, version)
6. Authors `.spec.ts` for each service/controller using the chosen test framework (Vitest / Jest per Block B.3)

## Inputs

- `aidlc-docs/construction/{unit}/functional-design/business-logic-model.md`
- `aidlc-docs/construction/{unit}/functional-design/business-rules.md`
- `aidlc-docs/construction/{unit}/functional-design/domain-entities.md`
- `aidlc-docs/construction/{unit}/stack-selection/stack-selection.md` (Block B)
- `aidlc-docs/construction/{unit}/nfr-design/nfr-design-patterns.md` (resilience patterns to apply)
- `<workspace-root>/shared/openapi.yaml` or equivalent (if api-contract-designer ran first)

## Outputs

Source code under the workspace root (NEVER under `aidlc-docs/`) following the NestJS layout in `../../aidlc-rule-details/construction/stacks/node-conventions.md` § NestJS:

```
src/
├── main.ts
├── app.module.ts
├── <feature>/
│   ├── <feature>.controller.ts
│   ├── <feature>.service.ts
│   ├── <feature>.module.ts
│   ├── dto/
│   ├── entities/
│   └── <feature>.spec.ts
├── common/                 # filters, pipes, interceptors
├── config/
└── shared/
```

Plus the code-summary entry in `<unit>-code-summary.md`.

## Governance

- **Free-roam invocation**: standard audit.md entries
- **Sensitive flag**: no
- **Tier scope**: Greenfield, Feature; rare on Bugfix (only when the bug is in BE behavior)

## Team Conventions Applied

- **Strict TypeScript** (`strict: true`, `noImplicitOverride: true`)
- **DTOs validated by class-validator** with explicit decorators; no `any` in public surface
- **Global exception filter** maps `AppError` (with `code`, `httpStatus`, `userMessage`, `cause`) to RFC 7807 problem+json
- **Global request-ID interceptor** ensures every log line has a `request_id`
- **Global validation pipe** with `whitelist: true, forbidNonWhitelisted: true` — extra body fields rejected
- **No `console.log`** in production code paths
- **Argon2id password hashing** (Recommended) or bcrypt cost ≥ 12
- **JWTs RS256/ES256 only** in production
- **Repository pattern** isolates the chosen ORM — services depend on repository interfaces, not raw ORM clients (testability)

## Tier-Specific Behavior

- **Greenfield**: full module scaffolding, full test coverage, full filter/pipe/interceptor wiring
- **Feature**: scope to the new module(s); reuse existing common/ filters/pipes
- **Bugfix**: surgical change in the affected file; preserve everything else

## See Also

- Upstream skill: `./upstream/README.md` (NestJS official guides + getsentry/sentry-nestjs-sdk for instrumentation)
- AI-DLC stage rule: `../../aidlc-rule-details/construction/code-generation.md`
- Stack convention: `../../aidlc-rule-details/construction/stacks/node-conventions.md` § NestJS
- Stack Selection: `../../aidlc-rule-details/construction/stack-selection.md` Block B
- Compliance hooks: extensions/security/baseline (SECURITY-05 input validation, SECURITY-08 access control, SECURITY-12 auth, SECURITY-15 fail-safe defaults)

## Trigger-test prompts

1. "Using AI-DLC, scaffold the auth NestJS module." (should trigger Stage 12 BE Node — NestJS)
2. "Generate the orders controller, service, and DTOs in NestJS." (should trigger)
3. "Implement the user-profile module with class-validator DTOs and Prisma." (should trigger)
4. "Generate the FastAPI router for /auth." (should NOT trigger — wrong framework)
5. "Build the contact-form React component." (should NOT trigger — wrong stack)
