-- Reviewed initial baseline for a genuinely empty PostgreSQL database.
-- Run with psql -X -v ON_ERROR_STOP=1 -d <verified-empty-target> -f database/baseline.sql
-- This file uses psql relative includes; do not execute individual source files
-- as a substitute for its preflight and version ledger.

\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
  unexpected_objects TEXT;
BEGIN
  -- Refuse custom schemas, relations, types, or routines anywhere outside the
  -- PostgreSQL system schemas. This rejects both complete and partial installs.
  SELECT string_agg(item, ', ' ORDER BY item)
    INTO unexpected_objects
  FROM (
    SELECT 'schema ' || quote_ident(nspname) AS item
    FROM pg_namespace
    WHERE nspname NOT IN ('pg_catalog', 'information_schema', 'public')
      AND nspname NOT LIKE 'pg_toast%'
    UNION ALL
    SELECT 'relation ' || quote_ident(n.nspname) || '.' || quote_ident(c.relname)
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
      AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
    UNION ALL
    SELECT 'type ' || quote_ident(n.nspname) || '.' || quote_ident(t.typname)
    FROM pg_type AS t
    JOIN pg_namespace AS n ON n.oid = t.typnamespace
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
      AND t.typtype IN ('e', 'd', 'c', 'r', 'm')
      AND t.typname NOT LIKE '\_%' ESCAPE '\'
    UNION ALL
    SELECT 'routine ' || quote_ident(n.nspname) || '.' || quote_ident(p.proname)
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  ) AS found;

  IF unexpected_objects IS NOT NULL THEN
    RAISE EXCEPTION 'Refusing baseline: target is not empty; found %', unexpected_objects;
  END IF;
END;
$$;

CREATE TABLE public.schema_migrations (
  version VARCHAR(100) PRIMARY KEY,
  description TEXT NOT NULL,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

\ir schema.sql
\ir functions.sql
\ir triggers.sql
\ir views.sql
\ir indexes.sql

INSERT INTO public.schema_migrations (version, description)
VALUES ('20261020_001', 'Initial complete application schema baseline');

COMMIT;
