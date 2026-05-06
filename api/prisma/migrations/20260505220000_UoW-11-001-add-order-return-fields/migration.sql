-- UoW-11 Migration 1: add return fields to orders
-- Reversible: DROP COLUMN return_reason, return_requested_at

ALTER TABLE "app"."orders"
  ADD COLUMN "return_reason" TEXT,
  ADD COLUMN "return_requested_at" TIMESTAMPTZ(6);
