-- =====================================================================
-- Vehicle Service & Maintenance Platform - Database Indexes
-- =====================================================================

-- Indexes for performance optimization on frequent queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_vehicles_owner ON vehicles(owner_id);
CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_vehicle ON bookings(vehicle_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_scheduled_date ON bookings(scheduled_date);
CREATE INDEX idx_mechanics_center ON mechanics(service_center_id);
CREATE INDEX idx_parts_part_number ON parts(part_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
