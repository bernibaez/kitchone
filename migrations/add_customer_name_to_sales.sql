-- Add customer_name field to sales table
ALTER TABLE sales ADD COLUMN customer_name TEXT;

-- Add comment to describe the field
COMMENT ON COLUMN sales.customer_name IS 'Optional customer name for the sale';
