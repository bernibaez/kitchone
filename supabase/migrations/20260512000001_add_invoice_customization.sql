-- Migration: Add invoice customization fields to restaurant_config
-- Date: 2026-05-12

ALTER TABLE restaurant_config 
ADD COLUMN IF NOT EXISTS invoice_paper_size TEXT DEFAULT 'a4',
ADD COLUMN IF NOT EXISTS invoice_font_size INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS invoice_font_family TEXT DEFAULT 'helvetica',
ADD COLUMN IF NOT EXISTS invoice_primary_color TEXT DEFAULT '#dc5519',
ADD COLUMN IF NOT EXISTS invoice_show_social BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS invoice_show_customer BOOLEAN DEFAULT true;

-- Update existing records with default values if necessary
UPDATE restaurant_config 
SET 
  invoice_paper_size = 'a4',
  invoice_font_size = 10,
  invoice_font_family = 'helvetica',
  invoice_primary_color = '#dc5519',
  invoice_show_social = true,
  invoice_show_customer = true
WHERE invoice_paper_size IS NULL;
