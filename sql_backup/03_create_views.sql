-- ===========================================
-- FARMING FAMILY SHOP - VIEWS
-- Backup Date: February 12, 2026
-- ===========================================
-- 1. DAILY SALES SUMMARY VIEW
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT s.sale_date,
  COUNT(DISTINCT s.id) AS total_transactions,
  COUNT(DISTINCT s.customer_id) AS total_customers,
  COUNT(si.id) AS total_items_sold,
  SUM(s.total_amount) AS total_sales,
  SUM(s.discount_total) AS total_discounts,
  AVG(s.total_amount) AS avg_transaction_value
FROM sales s
  LEFT JOIN sale_items si ON s.id = si.sale_id
GROUP BY s.sale_date
ORDER BY s.sale_date DESC;

-- 2. DAILY EXPENSE SUMMARY VIEW
CREATE OR REPLACE VIEW daily_expense_summary AS
SELECT expense_date,
  COUNT(*) AS total_expenses,
  SUM(amount) AS total_expense_amount,
  jsonb_object_agg(category, amount) AS expense_by_category
FROM expenses
GROUP BY expense_date
ORDER BY expense_date DESC;

-- 3. DAILY CASH SUMMARY VIEW
CREATE OR REPLACE VIEW daily_cash_summary AS
SELECT movement_date,
  SUM(
    CASE
      WHEN movement_type = 'opening' THEN amount
      ELSE 0
    END
  ) AS opening_balance,
  SUM(
    CASE
      WHEN movement_type = 'new_cash' THEN amount
      ELSE 0
    END
  ) AS new_cash_added,
  SUM(
    CASE
      WHEN movement_type = 'sales' THEN amount
      ELSE 0
    END
  ) AS sales_cash,
  SUM(
    CASE
      WHEN movement_type = 'expense' THEN amount
      ELSE 0
    END
  ) AS expense_cash,
  SUM(
    CASE
      WHEN movement_type = 'withdrawal' THEN amount
      ELSE 0
    END
  ) AS owner_withdrawal
FROM cash_movements
GROUP BY movement_date
ORDER BY movement_date DESC;

-- 4. LOW STOCK ALERT VIEW
CREATE OR REPLACE VIEW low_stock_alert AS
SELECT id,
  product_code,
  name_bengali,
  category,
  current_quantity,
  min_stock,
  current_weight,
  (current_quantity - min_stock) AS shortage_amount,
  CASE
    WHEN current_quantity <= 0 THEN 'স্টক শেষ'
    WHEN current_quantity <= min_stock * 0.5 THEN 'জরুরি স্টক প্রয়োজন'
    WHEN current_quantity <= min_stock THEN 'স্টক কম'
    ELSE 'পর্যাপ্ত'
  END AS stock_status
FROM products
WHERE current_quantity <= min_stock
  AND is_active = TRUE
ORDER BY (current_quantity - min_stock) ASC;

-- 5. DAILY COMPLETE REPORT
CREATE OR REPLACE VIEW daily_complete_report AS
SELECT COALESCE(s.sale_date, e.expense_date, c.movement_date) AS report_date,
  COALESCE(s.total_transactions, 0) AS total_transactions,
  COALESCE(s.total_customers, 0) AS total_customers,
  COALESCE(s.total_sales, 0) AS total_sales,
  COALESCE(s.total_discounts, 0) AS total_discounts,
  COALESCE(e.total_expenses, 0) AS total_expenses,
  COALESCE(c.opening_balance, 0) AS opening_balance,
  COALESCE(c.new_cash_added, 0) AS new_cash_added,
  COALESCE(c.owner_withdrawal, 0) AS owner_withdrawal,
  (
    COALESCE(c.opening_balance, 0) + COALESCE(c.new_cash_added, 0) + COALESCE(s.total_sales, 0) - COALESCE(e.total_expenses, 0) - COALESCE(c.owner_withdrawal, 0)
  ) AS cash_in_hand,
  (
    COALESCE(s.total_sales, 0) - COALESCE(e.total_expenses, 0)
  ) AS net_profit
FROM daily_sales_summary s
  FULL OUTER JOIN daily_expense_summary e ON s.sale_date = e.expense_date
  FULL OUTER JOIN daily_cash_summary c ON COALESCE(s.sale_date, e.expense_date) = c.movement_date
ORDER BY report_date DESC;

-- 6. MONTHLY SALES SUMMARY
CREATE OR REPLACE VIEW monthly_sales_summary AS
SELECT DATE_TRUNC('month', sale_date) AS MONTH,
  COUNT(DISTINCT id) AS total_transactions,
  COUNT(DISTINCT customer_id) AS total_customers,
  SUM(total_amount) AS total_sales,
  SUM(discount_total) AS total_discounts
FROM sales
GROUP BY DATE_TRUNC('month', sale_date)
ORDER BY MONTH DESC;

-- 7. MONTHLY EXPENSE SUMMARY
CREATE OR REPLACE VIEW monthly_expense_summary AS
SELECT DATE_TRUNC('month', expense_date) AS MONTH,
  COUNT(*) AS total_expenses,
  SUM(amount) AS total_expense_amount
FROM expenses
GROUP BY DATE_TRUNC('month', expense_date)
ORDER BY MONTH DESC;

-- 8. MONTHLY COMPLETE REPORT
CREATE OR REPLACE VIEW monthly_complete_report AS
SELECT COALESCE(s.month, e.month) AS MONTH,
  COALESCE(s.total_transactions, 0) AS total_transactions,
  COALESCE(s.total_customers, 0) AS total_customers,
  COALESCE(s.total_sales, 0) AS total_sales,
  COALESCE(s.total_discounts, 0) AS total_discounts,
  COALESCE(e.total_expenses, 0) AS total_expenses,
  COALESCE(e.total_expense_amount, 0) AS total_expense_amount,
  (
    COALESCE(s.total_sales, 0) - COALESCE(e.total_expenses, 0)
  ) AS net_profit
FROM monthly_sales_summary s
  FULL OUTER JOIN monthly_expense_summary e ON s.month = e.month
ORDER BY MONTH DESC;

-- 9. TOP PRODUCTS VIEW
CREATE OR REPLACE VIEW top_products AS
SELECT p.id,
  p.name_bengali,
  p.category,
  COUNT(si.id) AS times_sold,
  SUM(si.quantity_in_base) AS total_quantity_sold,
  SUM(si.total_price) AS total_revenue,
  AVG(si.unit_price) AS avg_selling_price
FROM products p
  JOIN sale_items si ON p.id = si.product_id
  JOIN sales s ON si.sale_id = s.id
WHERE s.sale_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.id,
  p.name_bengali,
  p.category
ORDER BY total_revenue DESC
LIMIT 5;

SELECT '✅ 03_create_views.sql - Backup completed!' AS message;