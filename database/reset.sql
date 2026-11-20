-- DESTRUCTIVE DEVELOPER RESET ONLY.
-- This script deletes application data and objects in the current database.
-- Never run against a shared, hosted, production, or valuable database.
-- Normal setup must use database/baseline.sql instead.

\set ON_ERROR_STOP on
BEGIN;

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS service_parts CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS parts CASCADE;
DROP TABLE IF EXISTS service_types CASCADE;
DROP TABLE IF EXISTS mechanics CASCADE;
DROP TABLE IF EXISTS service_center_hours CASCADE;
DROP TABLE IF EXISTS service_center CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS schema_migrations CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS invoice_status CASCADE;

CREATE TABLE schema_migrations (
  version VARCHAR(100) PRIMARY KEY,
  description TEXT NOT NULL,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

\ir schema.sql
\ir functions.sql
\ir triggers.sql
\ir views.sql
\ir indexes.sql

INSERT INTO schema_migrations (version, description)
VALUES ('20261020_001', 'Initial complete application schema baseline');

COMMIT;
