# Tech Stack Constraints (from NFRs) — UoW-07

**Constraints implied by NFR — fed into Stage 11 Stack Selection**:

- NFR-07-PERF-01 (< 1.5 s first token): requires streaming LLM client (already established — openai/anthropic SDK with stream=true)
- NFR-07-PERF-03 (< 500 ms search): Prisma full-text search (`_search` via PostgreSQL `tsv` column deferred to UoW-11); UoW-07 uses `prisma.product.findMany({ where: { title: { contains, mode: 'insensitive' } } })` — adequate for MVP scale
- NFR-07-PERF-04 (bulk create < 5 s): sequential inserts with individual error handling; no `createMany` (need per-item error capture)
- NFR-07-REL-04 (atomic product + audit): requires Prisma `$transaction()` for each write
- NFR-07-MAINT-03 (typed tool definitions): requires `LlmTool` type defined in `orchestrator.types.ts`

**No new packages required** (pending Stage 11 confirmation):
- ProductAgent: uses existing `ILlmProvider` (UoW-06), `PromptLoaderService` (UoW-06), `LlmCostMeterService` (UoW-04)
- ProductService: uses existing `PrismaService` (UoW-03), `AuditLogService` (UoW-03)
- FE widgets: existing `WidgetRenderer`, `ajv` (UoW-05)

**Open choices** (decided in Stage 11):
- Confirm whether `AuditLogService.log()` from UoW-03 is the correct integration point or if ProductService calls Prisma directly for audit rows
