-- Migration: Complete restaurant_config table with missing columns
-- Date: 2026-05-12

-- 1. Basic configuration columns
ALTER TABLE restaurant_config ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'DOP';
ALTER TABLE restaurant_config ADD COLUMN IF NOT EXISTS social_instagram TEXT;
ALTER TABLE restaurant_config ADD COLUMN IF NOT EXISTS social_facebook TEXT;
ALTER TABLE restaurant_config ADD COLUMN IF NOT EXISTS social_twitter TEXT;
ALTER TABLE restaurant_config ADD COLUMN IF NOT EXISTS purchase_message TEXT;
ALTER TABLE restaurant_config ADD COLUMN IF NOT EXISTS invoice_footer TEXT;

-- 2. Invoice customization columns
ALTER TABLE restaurant_config ADD COLUMN IF NOT EXISTS invoice_paper_size TEXT DEFAULT 'a4';
ALTER TABLE restaurant_config ADD COLUMN IF NOT EXISTS invoice_font_size INTEGER DEFAULT 10;
ALTER TABLE restaurant_config ADD COLUMN IF NOT EXISTS invoice_font_family TEXT DEFAULT 'helvetica';
ALTER TABLE restaurant_config ADD COLUMN IF NOT EXISTS invoice_primary_color TEXT DEFAULT '#dc5519';
ALTER TABLE restaurant_config ADD COLUMN IF NOT EXISTS invoice_show_social BOOLEAN DEFAULT true;
ALTER TABLE restaurant_config ADD COLUMN IF NOT EXISTS invoice_show_customer BOOLEAN DEFAULT true;

-- Add comments for clarity
COMMENT ON COLUMN restaurant_config.currency IS 'Moneda del sistema (DOP, USD, EUR, etc.)';
COMMENT ON COLUMN restaurant_config.purchase_message IS 'Mensaje de agradecimiento en la factura';
COMMENT ON COLUMN restaurant_config.invoice_footer IS 'Texto legal o adicional al pie de la factura';

-- Update existing record with default values
UPDATE restaurant_config 
SET 
  currency = COALESCE(currency, 'DOP'),
  invoice_paper_size = COALESCE(invoice_paper_size, 'a4'),
  invoice_font_size = COALESCE(invoice_font_size, 10),
  invoice_font_family = COALESCE(invoice_font_family, 'helvetica'),
  invoice_primary_color = COALESCE(invoice_primary_color, '#dc5519'),
  invoice_show_social = COALESCE(invoice_show_social, true),
  invoice_show_customer = COALESCE(invoice_show_customer, true)
WHERE id IS NOT NULL;
