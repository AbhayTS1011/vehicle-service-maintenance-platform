-- =====================================================================
-- Vehicle Service & Maintenance Platform - SQL Views
-- =====================================================================

-- View for customer booking history with vehicle and service details
CREATE OR REPLACE VIEW vw_customer_booking_history AS
SELECT 
    b.id AS booking_id,
    b.customer_id,
    u.name AS customer_name,
    v.id AS vehicle_id,
    CONCAT(v.year, ' ', v.make, ' ', v.model) AS vehicle_info,
    v.license_plate,
    st.name AS service_type_name,
    sc.name AS service_center_name,
    m.name AS mechanic_name,
    b.status,
    b.scheduled_date,
    b.created_at
FROM bookings b
JOIN users u ON b.customer_id = u.id
JOIN vehicles v ON b.vehicle_id = v.id
JOIN service_types st ON b.service_type_id = st.id
JOIN service_center sc ON b.service_center_id = sc.id
LEFT JOIN mechanics m ON b.mechanic_id = m.id;

-- View for low stock parts monitoring
CREATE OR REPLACE VIEW vw_low_stock_parts AS
SELECT 
    id,
    name,
    part_number,
    stock_quantity,
    reorder_threshold,
    unit_price
FROM parts
WHERE stock_quantity <= reorder_threshold;

-- View for service analytics and summary
CREATE OR REPLACE VIEW vw_service_analytics AS
SELECT 
    st.name AS service_type,
    COUNT(b.id) AS total_bookings,
    SUM(i.total_amount) AS total_revenue
FROM bookings b
JOIN service_types st ON b.service_type_id = st.id
LEFT JOIN invoices i ON b.id = i.booking_id
WHERE b.status = 'INVOICED'
GROUP BY st.name;
