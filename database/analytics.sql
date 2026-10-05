-- =====================================================================
-- Vehicle Service & Maintenance Platform - Advanced Analytics Queries
-- Demonstrating CTEs and Window Functions
-- =====================================================================

-- 1. Monthly Revenue Trend using CTEs and Window Functions
WITH monthly_revenue AS (
    SELECT 
        DATE_TRUNC('month', issued_at) AS service_month,
        SUM(total_amount) AS monthly_total,
        COUNT(id) AS invoice_count
    FROM invoices
    WHERE status = 'PAID'
    GROUP BY DATE_TRUNC('month', issued_at)
)
SELECT 
    service_month,
    monthly_total,
    invoice_count,
    LAG(monthly_total, 1) OVER (ORDER BY service_month) AS previous_month_revenue,
    ROUND(
        ((monthly_total - LAG(monthly_total, 1) OVER (ORDER BY service_month)) 
        NULLIF(LAG(monthly_total, 1) OVER (ORDER BY service_month), 0)) * 100, 2
    ) AS mom_growth_percentage
FROM monthly_revenue
ORDER BY service_month DESC;

-- 2. Mechanic Workload Ranking using Window Functions
SELECT 
    m.id AS mechanic_id,
    m.name AS mechanic_name,
    m.specialization,
    COUNT(b.id) AS total_assigned_bookings,
    RANK() OVER (ORDER BY COUNT(b.id) DESC) AS workload_rank
FROM mechanics m
LEFT JOIN bookings b ON m.id = b.mechanic_id
GROUP BY m.id, m.name, m.specialization;
