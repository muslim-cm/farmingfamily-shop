-- ===========================================
-- FARMING FAMILY SHOP - TRIGGERS
-- Backup Date: February 12, 2026
-- ===========================================
-- 1. GENERATE PRODUCT CODE TRIGGER
CREATE OR REPLACE FUNCTION generate_product_code() RETURNS TRIGGER AS $$ BEGIN NEW.product_code = CASE
    NEW.category
    WHEN 'ডিম' THEN 'EG-' || LPAD(
      COALESCE(
        (
          SELECT COUNT(*) + 1
          FROM products
          WHERE category = 'ডিম'
        )::TEXT,
        '1'
      ),
      3,
      '0'
    )
    WHEN 'প্রাণী খাদ্য' THEN 'FD-' || LPAD(
      COALESCE(
        (
          SELECT COUNT(*) + 1
          FROM products
          WHERE category = 'প্রাণী খাদ্য'
        )::TEXT,
        '1'
      ),
      3,
      '0'
    )
    WHEN 'প্রাণী ওষুধ' THEN 'MD-' || LPAD(
      COALESCE(
        (
          SELECT COUNT(*) + 1
          FROM products
          WHERE category = 'প্রাণী ওষুধ'
        )::TEXT,
        '1'
      ),
      3,
      '0'
    )
    WHEN 'কৃষি যন্ত্রপাতি' THEN 'EQ-' || LPAD(
      COALESCE(
        (
          SELECT COUNT(*) + 1
          FROM products
          WHERE category = 'কৃষি যন্ত্রপাতি'
        )::TEXT,
        '1'
      ),
      3,
      '0'
    )
    WHEN 'পাখি ও বাচ্চা' THEN 'LV-' || LPAD(
      COALESCE(
        (
          SELECT COUNT(*) + 1
          FROM products
          WHERE category = 'পাখি ও বাচ্চা'
        )::TEXT,
        '1'
      ),
      3,
      '0'
    )
  END;

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_product_code ON products;

CREATE TRIGGER trigger_generate_product_code BEFORE
INSERT ON products FOR EACH ROW EXECUTE FUNCTION generate_product_code();

-- 2. UPDATE STOCK ON SALE TRIGGER
CREATE OR REPLACE FUNCTION update_stock_on_sale() RETURNS TRIGGER AS $$
DECLARE product_cat TEXT;

BEGIN
SELECT category INTO product_cat
FROM products
WHERE id = NEW.product_id;

-- Update quantity for piece-based products
IF NEW.selling_unit IN ('pc', 'cage', 'হালি', 'ডজন', 'packet') THEN
UPDATE products
SET current_quantity = current_quantity - NEW.quantity_in_base
WHERE id = NEW.product_id;

END IF;

-- Update weight for livestock
IF NEW.selling_unit = 'kg'
OR product_cat = 'পাখি ও বাচ্চা' THEN
UPDATE products
SET current_weight = current_weight - COALESCE(NEW.weight_sold, 0)
WHERE id = NEW.product_id;

END IF;

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stock_on_sale ON sale_items;

CREATE TRIGGER trigger_update_stock_on_sale
AFTER
INSERT ON sale_items FOR EACH ROW EXECUTE FUNCTION update_stock_on_sale();

-- 3. UPDATE CUSTOMER ON SALE TRIGGER
CREATE OR REPLACE FUNCTION update_customer_on_sale() RETURNS TRIGGER AS $$ BEGIN IF NEW.customer_phone IS NOT NULL THEN
INSERT INTO customers (
    name,
    phone,
    total_purchases,
    visit_count,
    last_purchase_date,
    last_purchase_amount
  )
VALUES (
    NEW.customer_name,
    NEW.customer_phone,
    NEW.total_amount,
    1,
    NOW(),
    NEW.total_amount
  ) ON CONFLICT (phone) DO
UPDATE
SET name = EXCLUDED.name,
  total_purchases = customers.total_purchases + EXCLUDED.total_purchases,
  visit_count = customers.visit_count + 1,
  last_purchase_date = NOW(),
  last_purchase_amount = EXCLUDED.total_purchases;

END IF;

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_customer_on_sale ON sales;

CREATE TRIGGER trigger_update_customer_on_sale
AFTER
INSERT ON sales FOR EACH ROW EXECUTE FUNCTION update_customer_on_sale();

-- 4. LOG PRICE CHANGE TRIGGER
CREATE OR REPLACE FUNCTION log_price_change() RETURNS TRIGGER AS $$ BEGIN IF OLD.selling_price IS DISTINCT
FROM NEW.selling_price THEN
INSERT INTO price_history (
    product_id,
    product_name,
    old_price,
    new_price,
    changed_by
  )
VALUES (
    NEW.id,
    NEW.name_bengali,
    OLD.selling_price,
    NEW.selling_price,
    'system'
  );

END IF;

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_price_change ON products;

CREATE TRIGGER trigger_log_price_change
AFTER
UPDATE ON products FOR EACH ROW
  WHEN (
    OLD.selling_price IS DISTINCT
    FROM NEW.selling_price
  ) EXECUTE FUNCTION log_price_change();

-- 5. UPDATE STOCK ON PURCHASE TRIGGER
CREATE OR REPLACE FUNCTION update_stock_on_purchase() RETURNS TRIGGER AS $$
DECLARE product_cat TEXT;

BEGIN
SELECT category INTO product_cat
FROM products
WHERE id = NEW.product_id;

UPDATE products
SET current_quantity = current_quantity + NEW.quantity_added_to_stock
WHERE id = NEW.product_id;

IF product_cat = 'পাখি ও বাচ্চা'
AND NEW.weight_added > 0 THEN
UPDATE products
SET current_weight = current_weight + NEW.weight_added,
  avg_weight = (current_weight + NEW.weight_added) / (current_quantity + NEW.quantity_added_to_stock)
WHERE id = NEW.product_id;

END IF;

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stock_on_purchase ON purchases;

CREATE TRIGGER trigger_update_stock_on_purchase
AFTER
INSERT ON purchases FOR EACH ROW EXECUTE FUNCTION update_stock_on_purchase();

-- 6. UPDATE STOCK ON ADJUSTMENT TRIGGER
CREATE OR REPLACE FUNCTION update_stock_on_adjustment() RETURNS TRIGGER AS $$ BEGIN IF NEW.quantity_change != 0 THEN
UPDATE products
SET current_quantity = current_quantity + NEW.quantity_change
WHERE id = NEW.product_id;

END IF;

IF NEW.weight_change != 0 THEN
UPDATE products
SET current_weight = current_weight + NEW.weight_change
WHERE id = NEW.product_id;

END IF;

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stock_on_adjustment ON stock_adjustments;

CREATE TRIGGER trigger_update_stock_on_adjustment
AFTER
INSERT ON stock_adjustments FOR EACH ROW EXECUTE FUNCTION update_stock_on_adjustment();

-- 7. GENERATE INVOICE NUMBER TRIGGER
CREATE OR REPLACE FUNCTION generate_invoice_number() RETURNS TRIGGER AS $$
DECLARE date_part TEXT;

sequence_num TEXT;

BEGIN date_part := TO_CHAR(CURRENT_DATE, 'YYMMDD');

sequence_num := LPAD(
  COALESCE(
    (
      SELECT COUNT(*) + 1
      FROM sales
      WHERE sale_date = CURRENT_DATE
    )::TEXT,
    '1'
  ),
  4,
  '0'
);

NEW.invoice_number := 'INV-' || date_part || '-' || sequence_num;

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_invoice_number ON sales;

CREATE TRIGGER trigger_generate_invoice_number BEFORE
INSERT ON sales FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

SELECT '✅ 04_create_triggers.sql - Backup completed!' AS message;