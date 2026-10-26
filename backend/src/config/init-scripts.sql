-- Compatibility entry point for the canonical schema. Requires psql.
-- Existing deployments with the old id-based schema need an explicitly reviewed
-- data migration; this script never drops tables or creates sample accounts.
\set ON_ERROR_STOP on
\ir init-db.sql
\ir security-migration.sql
