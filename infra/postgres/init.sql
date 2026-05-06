-- Bootstrap script for the dev Postgres instance.
-- Runs once on first container start (mounted into /docker-entrypoint-initdb.d/).

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS audit;

-- Models for these schemas land in UoW-02 / UoW-03 via Prisma migrations.
