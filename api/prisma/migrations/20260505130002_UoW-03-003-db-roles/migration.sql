-- UoW-03-003: audit_writer_role — INSERT-only on audit.audit_log
-- app_role (ecomm) gets SELECT only on audit.audit_log; UPDATE/DELETE revoked from PUBLIC.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'audit_writer') THEN
    CREATE ROLE audit_writer;
  END IF;
END
$$;

-- audit_writer: INSERT only on audit.audit_log
GRANT USAGE ON SCHEMA audit TO audit_writer;
GRANT INSERT ON audit.audit_log TO audit_writer;

-- app_role (ecomm): SELECT only on audit.audit_log
GRANT USAGE ON SCHEMA audit TO ecomm;
GRANT SELECT ON audit.audit_log TO ecomm;

-- Revoke UPDATE and DELETE from PUBLIC (belt-and-suspenders; trigger also blocks these)
REVOKE UPDATE, DELETE ON audit.audit_log FROM PUBLIC;
