-- UoW-03-003: audit_writer_role — INSERT-only on audit.audit_log
-- app_role (ecomm) gets SELECT only on audit.audit_log; UPDATE/DELETE revoked from PUBLIC.
--
-- Made tolerant of managed Postgres environments (Render, Neon, Supabase) where:
--   1. The 'ecomm' role doesn't pre-exist (different naming on managed providers)
--   2. CREATE ROLE may require elevated privileges not granted to the app user
-- Each block is wrapped in defensive checks so missing roles or insufficient
-- privileges produce a NOTICE, not a hard failure.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'audit_writer') THEN
    BEGIN
      CREATE ROLE audit_writer;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'audit_writer role creation skipped: insufficient privilege (managed Postgres?)';
    END;
  END IF;
END
$$;

-- audit_writer: INSERT only on audit.audit_log (only if the role was creatable)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'audit_writer') THEN
    GRANT USAGE ON SCHEMA audit TO audit_writer;
    GRANT INSERT ON audit.audit_log TO audit_writer;
  END IF;
END
$$;

-- app_role (ecomm): SELECT only on audit.audit_log (skip if role doesn't exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'ecomm') THEN
    GRANT USAGE ON SCHEMA audit TO ecomm;
    GRANT SELECT ON audit.audit_log TO ecomm;
  ELSE
    RAISE NOTICE 'ecomm role not found — skipping grants (expected on managed Postgres)';
  END IF;
END
$$;

-- Revoke UPDATE and DELETE from PUBLIC (belt-and-suspenders; trigger also blocks these)
REVOKE UPDATE, DELETE ON audit.audit_log FROM PUBLIC;
