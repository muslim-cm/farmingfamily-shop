-- ===========================================
-- FARMING FAMILY SHOP - INDEXES
-- Backup Date: February 12, 2026
-- ===========================================
-- PRODUCTS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

CREATE INDEX IF NOT EXISTS idx_products_name_bengali ON products(name_bengali);

CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);

CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(current_quantity)
WHERE current_quantity <= min_stock;

-- SALES TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);

CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);

CREATE INDEX IF NOT EXISTS idx_sales_customer_phone ON sales(customer_phone);

CREATE INDEX IF NOT EXISTS idx_sales_created_by ON sales(created_by);

CREATE INDEX IF NOT EXISTS idx_sales_date_amount ON sales(sale_date, total_amount);

-- SALE_ITEMS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);

CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

CREATE INDEX IF NOT EXISTS idx_sale_items_created ON sale_items(created_at);

-- EXPENSES TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- PURCHASES TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_purchases_product ON purchases(product_id);

CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);

-- CUSTOMERS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

CREATE INDEX IF NOT EXISTS idx_customers_last_purchase ON customers(last_purchase_date);

-- STOCK_ADJUSTMENTS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product ON stock_adjustments(product_id);

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_date ON stock_adjustments(created_at);

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_type ON stock_adjustments(adjustment_type);

-- CASH_MOVEMENTS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_cash_movements_date ON cash_movements(movement_date);

CREATE INDEX IF NOT EXISTS idx_cash_movements_type ON cash_movements(movement_type);

-- ACTIVITY_LOGS TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_name);

CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action_type);

-- PRICE_HISTORY TABLE INDEXES
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id);

CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(created_at);

SELECT '✅ 05_create_indexes.sql - Backup completed!' AS message;