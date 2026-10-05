-- =====================================================================
-- Vehicle Service & Maintenance Platform - Seed Data
-- =====================================================================

-- Insert sample service center
INSERT INTO service_center (name, address, phone, email, operating_hours) 
VALUES ('Apex Auto Care Center', '123 Mechanic Street, Auto City, AC 12345', '+1-555-0199', 'support@apexautocare.com', 'Mon-Sat 8:00 AM - 6:00 PM')
ON CONFLICT DO NOTHING;

-- Insert sample users (Admin, Service Provider, Customer)
-- Password hashes correspond to bcrypt hash for 'Password123!'
INSERT INTO users (name, email, password_hash, role, phone) VALUES
('System Administrator', 'admin@apexautocare.com', '$2b$10$39aK.5vWjE9vP1xGZ8vJ.eL1m2N3o4P5q6R7s8T9u0V1w2X3y4Z5a', 'ADMIN', '+1-555-0100'),
('Service Manager John', 'provider@apexautocare.com', '$2b$10$39aK.5vWjE9vP1xGZ8vJ.eL1m2N3o4P5q6R7s8T9u0V1w2X3y4Z5a', 'SERVICE_PROVIDER', '+1-555-0101'),
('Alice Smith (Customer)', 'alice@example.com', '$2b$10$39aK.5vWjE9vP1xGZ8vJ.eL1m2N3o4P5q6R7s8T9u0V1w2X3y4Z5a', 'CUSTOMER', '+1-555-0102'),
('Bob Jones (Fleet Manager)', 'bob@fleetcorp.com', '$2b$10$39aK.5vWjE9vP1xGZ8vJ.eL1m2N3o4P5q6R7s8T9u0V1w2X3y4Z5a', 'FLEET_MANAGER', '+1-555-0103')
ON CONFLICT (email) DO NOTHING;

-- Insert sample mechanics
INSERT INTO mechanics (service_center_id, name, specialization, phone, is_active) VALUES
(1, 'Michael Vance', 'Engine & Transmission', '+1-555-0201', TRUE),
(1, 'David Miller', 'Electrical & Diagnostics', '+1-555-0202', TRUE),
(1, 'Sarah Connor', 'General Maintenance & Brakes', '+1-555-0203', TRUE)
ON CONFLICT DO NOTHING;

-- Insert sample service types
INSERT INTO service_types (name, description, base_price, estimated_duration_minutes) VALUES
('Standard Oil Change', 'Complete oil and filter replacement with multi-point inspection.', 49.99, 45),
('Brake Pad Replacement', 'Front or rear brake pad replacement and rotor check.', 149.99, 90),
('Full Engine Diagnostics', 'Comprehensive computerized engine diagnostic scan.', 89.99, 60),
('General Servicing & Tune-Up', 'Spark plug replacement, fluid check, and filter change.', 199.99, 120)
ON CONFLICT (name) DO NOTHING;

-- Insert sample parts inventory
INSERT INTO parts (name, part_number, description, unit_price, stock_quantity, reorder_threshold) VALUES
('Synthetic Oil 5W-30 (1L)', 'OIL-SYN-5W30', 'High performance synthetic engine oil', 12.50, 100, 20),
('Oil Filter OF-201', 'FILT-OIL-201', 'Standard oil filter for most sedans and SUVs', 8.00, 50, 10),
('Brake Pad Set (Front)', 'BRK-PAD-F', 'Heavy duty ceramic front brake pads', 65.00, 30, 8),
('Spark Plug Iridium', 'SPK-PLG-IRD', 'Long-life iridium spark plug', 15.00, 80, 15)
ON CONFLICT (part_number) DO NOTHING;

-- Insert sample vehicles
INSERT INTO vehicles (owner_id, make, model, year, license_plate, vin, mileage) VALUES
(3, 'Toyota', 'Camry', 2021, 'ABC-1234', '1HGCR2F83HA000001', 25000),
(4, 'Ford', 'Transit Van', 2022, 'FLT-5678', '1FTNE3Y85NK000002', 45000),
(4, 'Honda', 'Civic', 2020, 'FLT-9012', '2HGFE2F52LH000003', 32000)
ON CONFLICT (license_plate) DO NOTHING;
