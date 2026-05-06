# Logical Components — UoW-07 (Product Agent + Product Tools)

**Date**: 2026-05-05

---

## LC-01: ProductAgent

**Purpose**: IAgent implementation that handles all product-related intents; orchestrates LLM tool-calling loop  
**Type**: NestJS injectable service, AsyncGenerator-based  
**Pattern**: Stateless agentic loop (P-SCAL-01); tool-calling with hard iteration limit (P-RES-03)  
**Location**: `api/src/orchestrator/agents/product/product.agent.ts`  
**Registered in**: `AGENT_REGISTRY` Map as key `'product'`

---

## LC-02: ProductService

**Purpose**: Domain service for all Product/ProductVariant DB operations; called by ProductAgent tools  
**Type**: NestJS injectable service, wraps PrismaService  
**Pattern**: Atomic write + audit log (P-RES-04); sequential bulk insert (P-SCAL-02); role-gate defence-in-depth (P-SEC-01)  
**Location**: `api/src/orchestrator/agents/product/product.service.ts`  
**Depends on**: PrismaService, AuditLogService (UoW-03), Logger

---

## LC-03: ProductTools (typed tool definitions)

**Purpose**: LLM tool schema definitions for all 8 product tools  
**Type**: Exported constant `PRODUCT_TOOLS: LlmTool[]`  
**Pattern**: Typed tool definitions (P-AIML-02)  
**Location**: `api/src/orchestrator/agents/product/product.tools.ts`

---

## LC-04: ProductAgent Prompt (versioned)

**Purpose**: System prompt for the ProductAgent LLM; drives tool-calling and conversational field gathering  
**Type**: Text file, loaded by PromptLoaderService at module init  
**Pattern**: Versioned prompt file (P-AIML-01)  
**Location**: `api/src/orchestrator/prompts/product-agent.v1.0.0.txt`  
**Version constant**: Added to `PROMPT_VERSIONS` in `prompt-loader.service.ts`

---

## LC-05: ProductAgent Eval Suite

**Purpose**: Eval test cases for gate-level AI/ML quality check (NFR-07-AIML-02)  
**Type**: Vitest test file with golden-path + adversarial cases  
**Pattern**: Eval suite (P-AIML-03)  
**Location**: `api/src/orchestrator/agents/product/evals/product-agent.eval.ts`

---

## LC-06: ProductEditPreview Widget (FE)

**Purpose**: Renders product creation/update preview with diff highlighting and confirm/edit-more actions  
**Type**: React functional component, stateless  
**Pattern**: Widget rendering pattern (UoW-05); AJV schema validation  
**Location**: `web/components/widgets/ProductEditPreview.tsx`  
**Schema**: `web/widget-schemas/product-edit-preview.schema.json`

---

## LC-07: BulkProductPreview Widget (FE)

**Purpose**: Renders bulk product creation preview with per-line status and confirm/cancel actions  
**Type**: React functional component, stateless  
**Pattern**: Widget rendering pattern (UoW-05); AJV schema validation  
**Location**: `web/components/widgets/BulkProductPreview.tsx`  
**Schema**: `web/widget-schemas/bulk-product-preview.schema.json`

---

## LC-08: DESTRUCTIVE_INTENTS Extension

**Purpose**: Adds `'product.archive'` to the existing destructive intents set from UoW-06  
**Type**: One-line addition to existing constant  
**Location**: `api/src/orchestrator/confirmation/destructive-intents.const.ts`  
**Pattern**: P-SEC-03

---

## LC-09: LlmTool Type (shared)

**Purpose**: TypeScript interface for LLM tool definitions shared across all agents  
**Type**: Interface in `orchestrator.types.ts`  
**Location**: `api/src/orchestrator/types/orchestrator.types.ts` (extend existing)  
**Pattern**: P-AIML-02

---

## Components NOT introduced by UoW-07 (reused from prior UoWs)

| Component | Source UoW |
|-----------|-----------|
| ILlmProvider / LlmModule | UoW-06 |
| PromptLoaderService | UoW-06 |
| AuditLogService | UoW-03 |
| PrismaService | UoW-03 |
| LlmCostMeterService | UoW-04 |
| OrchestratorService confirmation protocol | UoW-06 |
| WidgetRenderer | UoW-05 |
| AJV schema validation | UoW-05 |
