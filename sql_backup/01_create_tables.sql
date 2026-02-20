-- ===========================================
-- FARMING FAMILY SHOP - CREATE TABLES
-- Backup Date: February 12, 2026
-- ===========================================
-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_code TEXT UNIQUE,
  name_bengali TEXT NOT NULL,
  name_english TEXT,
  category TEXT NOT NULL,
  unit_type TEXT CHECK (unit_type IN ('piece', 'weight', 'both')),
  base_unit TEXT DEFAULT 'pc',
  available_units JSONB,
  selling_price DECIMAL(10, 2) NOT NULL,
  purchase_price DECIMAL(10, 2),
  discount_allowed BOOLEAN DEFAULT TRUE,
  current_quantity DECIMAL(10, 3) DEFAULT 0,
  current_weight DECIMAL(10, 3) DEFAULT 0,
  min_stock DECIMAL(10, 3) DEFAULT 10,
  avg_weight DECIMAL(10, 3),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_code TEXT UNIQUE,
  name TEXT,
  phone TEXT UNIQUE,
  address TEXT,
  total_purchases DECIMAL(12, 2) DEFAULT 0,
  visit_count INTEGER DEFAULT 1,
  last_purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_purchase_amount DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SALES TABLE
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT UNIQUE,
  customer_id UUID REFERENCES customers(id) ON DELETE
  SET NULL,
    customer_name TEXT,
    customer_phone TEXT,
    subtotal DECIMAL(12, 2) NOT NULL,
    discount_total DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,
    cash_received DECIMAL(12, 2) NOT NULL,
    change_amount DECIMAL(12, 2) DEFAULT 0,
    sale_date DATE DEFAULT CURRENT_DATE,
    sale_time TIME DEFAULT CURRENT_TIME,
    created_by TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SALE_ITEMS TABLE
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  selling_unit TEXT NOT NULL,
  quantity_in_unit DECIMAL(10, 3) NOT NULL,
  quantity_in_base DECIMAL(10, 3) NOT NULL,
  weight_sold DECIMAL(10, 3),
  unit_price DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. PURCHASES TABLE
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_number TEXT UNIQUE,
  product_id UUID NOT NULL REFERENCES products(id),
  supplier_name TEXT,
  purchase_unit TEXT NOT NULL,
  quantity DECIMAL(10, 3) NOT NULL,
  rate_per_unit DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0,
  total_cost DECIMAL(10, 2) GENERATED ALWAYS AS ((quantity * rate_per_unit) - discount) STORED,
  quantity_added_to_stock DECIMAL(10, 3),
  weight_added DECIMAL(10, 3),
  new_avg_weight DECIMAL(10, 3),
  purchase_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_number TEXT UNIQUE,
  category TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  payment_method TEXT DEFAULT 'cash',
  expense_date DATE DEFAULT CURRENT_DATE,
  entered_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. STOCK_ADJUSTMENTS TABLE
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  adjustment_number TEXT UNIQUE,
  product_id UUID NOT NULL REFERENCES products(id),
  adjustment_type TEXT NOT NULL,
  reason_bengali TEXT NOT NULL,
  reason_english TEXT,
  unit TEXT DEFAULT 'pc',
  quantity_change DECIMAL(10, 3) DEFAULT 0,
  weight_change DECIMAL(10, 3) DEFAULT 0,
  notes TEXT,
  adjusted_by TEXT,
  adjustment_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. CASH_MOVEMENTS TABLE
CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  movement_number TEXT UNIQUE,
  movement_type TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  previous_balance DECIMAL(12, 2) NOT NULL,
  new_balance DECIMAL(12, 2) NOT NULL,
  notes TEXT,
  entered_by TEXT,
  movement_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'cashier')),
  can_add_products BOOLEAN DEFAULT false,
  can_edit_products BOOLEAN DEFAULT false,
  can_delete_products BOOLEAN DEFAULT false,
  can_add_sales BOOLEAN DEFAULT TRUE,
  can_delete_sales BOOLEAN DEFAULT false,
  can_add_expenses BOOLEAN DEFAULT false,
  can_delete_expenses BOOLEAN DEFAULT false,
  can_view_reports BOOLEAN DEFAULT false,
  can_download_pdf BOOLEAN DEFAULT false,
  can_share_reports BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. ACTIVITY_LOGS TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name TEXT,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. PRICE_HISTORY TABLE
CREATE TABLE IF NOT EXISTS price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  product_name TEXT,
  old_price DECIMAL(10, 2),
  new_price DECIMAL(10, 2),
  changed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT '✅ 01_create_tables.sql - Backup completed!' AS message;