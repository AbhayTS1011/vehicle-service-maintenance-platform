-- Add structured, timezone-aware weekly hours for appointment scheduling.
-- Existing centers with the exact schema/seed default are backfilled; custom
-- free-text hours require an administrator to configure weekly hours manually.
-- The timezone remains unset so scheduling stays unavailable until configured.

ALTER TABLE service_center
  ADD COLUMN IF NOT EXISTS time_zone VARCHAR(64);

CREATE TABLE IF NOT EXISTS service_center_hours (
  service_center_id INTEGER NOT NULL REFERENCES service_center(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  opens_at TIME NOT NULL,
  closes_at TIME NOT NULL,
  PRIMARY KEY (service_center_id, day_of_week, opens_at),
  CHECK (closes_at > opens_at)
);

INSERT INTO service_center_hours (service_center_id, day_of_week, opens_at, closes_at)
SELECT center.id, day.day_of_week, TIME '08:00', TIME '18:00'
FROM service_center AS center
CROSS JOIN generate_series(1, 6) AS day(day_of_week)
WHERE center.operating_hours = 'Mon-Sat 8:00 AM - 6:00 PM'
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_bookings_center_status_date
  ON bookings(service_center_id, status, scheduled_date);
