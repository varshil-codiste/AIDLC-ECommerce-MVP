-- Migration: UoW-04-001-llm-cost-records
-- Creates app.llm_cost_records table for LLM call cost tracking
-- Extends audit.audit_log with trace_id and span_id columns

CREATE TABLE "app"."llm_cost_records" (
    "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
    "trace_id"     TEXT        NOT NULL,
    "span_id"      TEXT        NOT NULL,
    "model"        TEXT        NOT NULL,
    "agent_module" TEXT,
    "input_tokens" INTEGER     NOT NULL,
    "output_tokens" INTEGER    NOT NULL,
    "cost_usd"     DECIMAL(10,6) NOT NULL,
    "called_at"    TIMESTAMPTZ NOT NULL,
    "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "llm_cost_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "llm_cost_records_called_at_idx" ON "app"."llm_cost_records" ("called_at");

-- Extend audit.audit_log with trace correlation fields
ALTER TABLE "audit"."audit_log"
    ADD COLUMN "trace_id" TEXT,
    ADD COLUMN "span_id"  TEXT;
