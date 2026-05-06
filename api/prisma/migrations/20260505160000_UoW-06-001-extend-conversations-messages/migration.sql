-- UoW-06-001: Extend conversations (userRole, title, closedAt) and messages (widgetType, tokensIn, tokensOut, costUsd, traceId)

-- AlterTable conversations — add orchestrator fields
ALTER TABLE "app"."conversations"
  ADD COLUMN IF NOT EXISTS "user_role"       TEXT          NOT NULL DEFAULT 'shopper',
  ADD COLUMN IF NOT EXISTS "title"           VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "closed_at"       TIMESTAMPTZ(6);

-- CreateIndex on conversations (userId + lastActivityAt) for role-aware queries
CREATE INDEX IF NOT EXISTS "conversations_user_last_activity_idx"
  ON "app"."conversations" ("user_id", "last_activity_at");

-- AlterTable messages — add orchestrator + telemetry fields
ALTER TABLE "app"."messages"
  ADD COLUMN IF NOT EXISTS "widget_type"  VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "tokens_in"   INTEGER,
  ADD COLUMN IF NOT EXISTS "tokens_out"  INTEGER,
  ADD COLUMN IF NOT EXISTS "cost_usd"    DECIMAL(12,6),
  ADD COLUMN IF NOT EXISTS "trace_id"    VARCHAR(32);
