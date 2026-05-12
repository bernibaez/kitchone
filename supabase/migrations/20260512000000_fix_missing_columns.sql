-- Migration to fix missing columns reported in errors
-- Date: 2026-05-12

-- 1. Add customer_name to sales if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='customer_name') THEN
        ALTER TABLE sales ADD COLUMN customer_name TEXT;
        COMMENT ON COLUMN sales.customer_name IS 'Optional customer name for the sale';
    END IF;
END $$;

-- 2. Add total to orders
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='total') THEN
        ALTER TABLE orders ADD COLUMN total NUMERIC(10,2) DEFAULT 0;
        COMMENT ON COLUMN orders.total IS 'Total amount of the order';
    END IF;
END $$;

-- 3. Add category to expenses
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='category') THEN
        ALTER TABLE expenses ADD COLUMN category TEXT;
        COMMENT ON COLUMN expenses.category IS 'Category of the expense for reporting';
    END IF;
END $$;

-- 4. Add category to sale_items
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_items' AND column_name='category') THEN
        ALTER TABLE sale_items ADD COLUMN category TEXT;
        COMMENT ON COLUMN sale_items.category IS 'Category of the dish at the time of sale for reporting';
    END IF;
END $$;

-- Refresh PostgREST schema cache (optional, but helpful to remind user)
-- NOTIFY pgrst, 'reload schema';
