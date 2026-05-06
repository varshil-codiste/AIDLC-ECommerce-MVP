-- UoW-02-001 — create app.users table
-- Role-aware account entity: shopper | merchant | admin
-- CITEXT email for case-insensitive lookup; argon2id password_hash stored server-side only.

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE "app"."users" (
    "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
    "role"           TEXT NOT NULL,
    "email"          CITEXT NOT NULL,
    "password_hash"  TEXT NOT NULL,
    "name"           TEXT,
    "phone"          TEXT,
    "status"         TEXT NOT NULL DEFAULT 'active',
    "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "last_active_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_role_check" CHECK (role IN ('shopper', 'merchant', 'admin')),
    CONSTRAINT "users_status_check" CHECK (status IN ('active', 'disabled', 'anonymized'))
);

CREATE UNIQUE INDEX "users_email_idx" ON "app"."users" ("email");
CREATE INDEX "users_last_active_at_idx" ON "app"."users" ("last_active_at");
