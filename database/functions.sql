-- =====================================================================
-- Vehicle Service & Maintenance Platform - SQL Functions
-- =====================================================================

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate invoice totals based on service labor and consumed parts
CREATE OR REPLACE FUNCTION calculate_invoice_totals(p_service_id INTEGER)
RETURNS TABLE (
    calculated_subtotal DECIMAL(10,2),
    calculated_tax DECIMAL(10,2),
    calculated_total DECIMAL(10,2)
) AS $$
DECLARE
    v_labor_cost DECIMAL(10,2);
    v_parts_cost DECIMAL(10,2) := 0.00;
    v_subtotal DECIMAL(10,2);
    v_tax DECIMAL(10,2);
    v_total DECIMAL(10,2);
BEGIN
    -- Get labor cost
    SELECT COALESCE(labor_cost, 0.00) INTO v_labor_cost
    FROM services WHERE id = p_service_id;

    -- Get total parts cost for this service
    SELECT COALESCE(SUM(quantity * unit_price_at_time), 0.00) INTO v_parts_cost
    FROM service_parts WHERE service_id = p_service_id;

    v_subtotal := v_labor_cost + v_parts_cost;
    v_tax := v_subtotal * 0.18; -- 18% standard service tax
    v_total := v_subtotal + v_tax;

    RETURN QUERY SELECT v_subtotal, v_tax, v_total;
END;
$$ LANGUAGE plpgsql;
