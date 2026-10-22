-- Shared fixed-window login throttling for account and trusted client-IP buckets.
-- Apply only after baseline version 20261020_001 to the intended non-production DB.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.schema_migrations') IS NULL THEN
    RAISE EXCEPTION 'Refusing login-rate-limit migration: schema_migrations is missing; reconcile this legacy database first';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations WHERE version = '20261020_001'
  ) THEN
    RAISE EXCEPTION 'Refusing login-rate-limit migration: expected baseline 20261020_001';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.schema_migrations WHERE version = '20261022_001'
  ) THEN
    RAISE EXCEPTION 'Refusing login-rate-limit migration: version 20261022_001 is already recorded';
  END IF;
  IF to_regclass('public.users') IS NULL OR to_regclass('public.login_rate_limit_buckets') IS NOT NULL THEN
    RAISE EXCEPTION 'Refusing login-rate-limit migration: unexpected schema state';
  END IF;
END;
$$;

CREATE TABLE public.login_rate_limit_buckets (
  bucket_kind TEXT NOT NULL CHECK (bucket_kind IN ('account', 'ip')),
  bucket_hash CHAR(64) NOT NULL CHECK (bucket_hash ~ '^[0-9a-f]{64}$'),
  window_started_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts SMALLINT NOT NULL CHECK (attempts BETWEEN 1 AND 31),
  PRIMARY KEY (bucket_kind, bucket_hash)
);

CREATE INDEX idx_login_rate_limit_buckets_expiry
  ON public.login_rate_limit_buckets (expires_at);

CREATE FUNCTION public.consume_login_rate_limit(
  p_bucket_kind TEXT,
  p_bucket_hash TEXT,
  p_max_attempts INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_attempts SMALLINT;
BEGIN
  IF p_bucket_kind IS NULL OR p_bucket_hash IS NULL OR p_max_attempts IS NULL OR
     p_bucket_kind NOT IN ('account', 'ip') OR p_bucket_hash !~ '^[0-9a-f]{64}$' OR
     (p_bucket_kind = 'account' AND p_max_attempts <> 5) OR
     (p_bucket_kind = 'ip' AND p_max_attempts <> 30) THEN
    RAISE EXCEPTION 'Invalid login rate-limit bucket request';
  END IF;

  -- Remove expired rows during normal use; no scheduler or process-local state is needed.
  DELETE FROM public.login_rate_limit_buckets
  WHERE expires_at < v_now - INTERVAL '1 hour';

  INSERT INTO public.login_rate_limit_buckets AS current_bucket
    (bucket_kind, bucket_hash, window_started_at, expires_at, attempts)
  VALUES (p_bucket_kind, p_bucket_hash, v_now, v_now + INTERVAL '15 minutes', 1)
  ON CONFLICT (bucket_kind, bucket_hash) DO UPDATE
    SET window_started_at = CASE
          WHEN current_bucket.window_started_at <= v_now - INTERVAL '15 minutes' THEN v_now
          ELSE current_bucket.window_started_at
        END,
        expires_at = CASE
          WHEN current_bucket.window_started_at <= v_now - INTERVAL '15 minutes' THEN v_now + INTERVAL '15 minutes'
          ELSE current_bucket.expires_at
        END,
        attempts = CASE
          WHEN current_bucket.window_started_at <= v_now - INTERVAL '15 minutes' THEN 1
          ELSE LEAST(current_bucket.attempts + 1, p_max_attempts + 1)
        END
  RETURNING attempts INTO v_attempts;

  RETURN v_attempts <= p_max_attempts;
END;
$$;

INSERT INTO public.schema_migrations (version, description)
VALUES ('20261022_001', 'Shared PostgreSQL login rate-limit buckets');

COMMIT;
