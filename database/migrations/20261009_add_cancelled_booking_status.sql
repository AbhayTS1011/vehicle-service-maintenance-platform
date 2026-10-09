-- Forward-only enum extension for Phase 4C.4 customer cancellation.
-- Apply to an existing PostgreSQL database before deploying code that writes CANCELLED.
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'CANCELLED';
