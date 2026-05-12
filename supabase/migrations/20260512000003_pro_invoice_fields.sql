-- Migration: Add professional invoice customization fields
-- Date: 2026-05-12

ALTER TABLE restaurant_config 
ADD COLUMN IF NOT EXISTS business_id TEXT, -- RNC, NIF, NIT, etc.
ADD COLUMN IF NOT EXISTS invoice_template TEXT DEFAULT 'modern', -- modern, classic, minimalist
ADD COLUMN IF NOT EXISTS invoice_logo_url TEXT,
ADD COLUMN IF NOT EXISTS invoice_show_qr BOOLEAN DEFAULT true;

-- Update existing record with default values
UPDATE restaurant_config 
SET 
  invoice_template = COALESCE(invoice_template, 'modern'),
  invoice_show_qr = COALESCE(invoice_show_qr, true)
WHERE id IS NOT NULL;
