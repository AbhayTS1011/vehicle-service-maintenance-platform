-- Forward-only enum extension for Phase 4C.7 provider booking rejection.
-- Apply to an existing PostgreSQL database before deploying code that writes REJECTED.
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'REJECTED';
