---
name: api-contract-designer
description: |
  Use when designing the cross-stack API contract at AI-DLC Stage 8 (Functional Design) for any UoW that spans Frontend, Backend, or Mobile. Produces an OpenAPI 3.1 spec, GraphQL SDL, gRPC .proto file, or shared TypeScript types under the shared/ directory based on the choice made at Stack Selection Block F.1. Validates the contract is complete (every endpoint has request + response schemas, error envelopes, pagination, versioning) and codegen-ready so FE/BE/Mobile can each generate typed clients from it. Auto-skips when the UoW is single-stack with no contract surface.
aidlc:
  sensitive: false
---

# API Contract Designer

## When to Use (AI-DLC context)

This skill fires at **Stage 8 — Functional Design** (`../../aidlc-rule-details/construction/functional-design.md`) for any UoW that has cross-stack edges. The contract format was chosen earlier at Stage 11 Stack Selection Block F.1 — this skill executes the chosen format and produces the contract artifact under `shared/<format>/`.

It runs BEFORE the per-stack code-generation skills (#6–#10) because they consume the generated contract to scaffold typed clients.

## What It Does

Reads:
- `business-rules.md` (request/response semantics per business rule)
- `domain-entities.md` (data shapes)
- `application-design.md` § cross-stack contracts (versioning + error envelope decisions)

Produces:
- **OpenAPI 3.1**: `shared/openapi.yaml` + per-stack codegen wrappers (e.g., `openapi-typescript-codegen` for FE, `openapi-python-client` for Python, `oapi-codegen` for Go, `openapi-generator` for Flutter)
- **GraphQL SDL**: `shared/schema.graphql` + Apollo / urql / chopper config snippets
- **gRPC .proto**: `shared/<service>.proto` + per-stack codegen
- **Shared TypeScript types** (monorepo only): `shared/types/<unit>.ts` exported via package.json paths

For all formats, the skill validates:
- Every endpoint has request schema + response schema (no untyped `any`)
- Error envelope follows `application-design.md` decision (default: RFC 7807 problem+json)
- Pagination convention is consistent (cursor- vs offset-based)
- Versioning convention is followed (URL path / Accept header / GraphQL field deprecation)
- Auth scheme matches Application Design (e.g., bearer JWT, API key, mTLS)

## Inputs

- `aidlc-docs/inception/application-design/application-design.md`
- `aidlc-docs/construction/{unit}/functional-design/domain-entities.md`
- `aidlc-docs/construction/{unit}/functional-design/business-rules.md`
- `aidlc-docs/construction/{unit}/stack-selection/stack-selection.md` (Block F.1)

## Outputs

- `<workspace-root>/shared/<format>/<files>` (the actual contract source-of-truth)
- `aidlc-docs/construction/{unit}/functional-design/api-contract-summary.md` (the human-readable summary cross-linking endpoints to FR/BR IDs)
- `aidlc-docs/construction/{unit}/functional-design/api-contract-validation.md` (the validation report — completeness, consistency, codegen-readiness)

## Governance

- **Free-roam invocation**: standard audit.md entries
- **Sensitive flag**: no (writes only to `shared/` and docs)
- **Tier scope**: Greenfield, Feature (rare on Bugfix unless the bug is in the contract itself)

## Team Conventions Applied

- **One source-of-truth contract** lives at `shared/<format>/` — FE/BE/Mobile codegen read from it; nobody hand-writes types that overlap with the contract surface
- **Error envelope** = RFC 7807 problem+json by default for REST; GraphQL uses standard `errors[]`; gRPC uses standard status codes — explicit in the contract
- **Versioning policy** documented in the contract (header, URL, or GraphQL deprecation directive) — the skill refuses to ship a contract without an explicit policy
- **Codegen-ready check** — generates a temp client in each consuming stack to confirm the contract compiles cleanly before declaring done
- **Schema completeness** — every property has a type, every endpoint has at least one explicit response status, every error response has a problem+json schema

## Tier-Specific Behavior

- **Greenfield**: full contract authoring; all endpoints in the UoW; comprehensive examples per endpoint
- **Feature**: extend an existing contract — diff-friendly (additive changes preferred over edits); breaking changes flagged for the pod
- **Bugfix**: skip unless the bug IS the contract; in that case operate strictly within the affected endpoints

## Validation report contents

The skill writes `api-contract-validation.md` with:

| Check | Result | Notes |
|-------|--------|-------|
| All endpoints have request schema | ✅/❌ | … |
| All endpoints have response schema | ✅/❌ | … |
| Error envelope conforms to RFC 7807 (REST) / standard (GraphQL/gRPC) | ✅/❌ | … |
| Pagination consistent across list endpoints | ✅/❌ | … |
| Auth scheme declared on every authenticated endpoint | ✅/❌ | … |
| Codegen smoke test (per consuming stack) | ✅/❌ | … |

Any ❌ blocks the stage from completion.

## See Also

- Upstream skill: `./upstream/README.md` (apollographql/graphql-schema for GraphQL, plus OpenAPI tooling references)
- AI-DLC stage rule: `../../aidlc-rule-details/construction/functional-design.md`
- Stack Selection: `../../aidlc-rule-details/construction/stack-selection.md` Block F.1
- Compliance hooks: extensions/security/baseline (SECURITY-04 headers in REST contracts; SECURITY-08 auth on every endpoint), extensions/accessibility (no impact)

## Trigger-test prompts

1. "Using AI-DLC, design the OpenAPI for the auth UoW." (should trigger Stage 8)
2. "Generate the GraphQL schema for the orders UoW." (should trigger)
3. "We need a .proto for the recommendations service." (should trigger)
4. "Run the linter on the generated client." (should NOT trigger — that's lint-aggregator)
5. "Set up Sentry for the FE." (should NOT trigger — wrong stage)
