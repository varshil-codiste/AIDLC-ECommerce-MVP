-- UoW-03-002: audit.audit_log table + append-only trigger + index

-- CreateTable
CREATE TABLE "audit"."audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_user_id" UUID,
    "actor_role" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "request_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_log_entity_id_idx" ON "audit"."audit_log"("entity", "entity_id", "created_at" DESC);

-- Append-only enforcement: trigger raises EXCEPTION on any UPDATE or DELETE attempt
CREATE OR REPLACE FUNCTION audit.fn_audit_log_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit.audit_log is append-only: % is forbidden', TG_OP;
END;
$$;

CREATE TRIGGER tg_audit_log_no_update_delete
BEFORE UPDATE OR DELETE ON audit.audit_log
FOR EACH ROW EXECUTE FUNCTION audit.fn_audit_log_immutable();
