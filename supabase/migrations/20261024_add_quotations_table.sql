-- =====================================================
-- Migración: Módulo de Cotizaciones / Presupuestos
-- =====================================================

-- Secuencia para folios correlativos de cotizaciones (ej: COT-0001)
CREATE SEQUENCE IF NOT EXISTS quotation_number_seq START 1;

CREATE OR REPLACE FUNCTION get_next_quotation_number()
RETURNS text AS $$
DECLARE
  next_val integer;
BEGIN
  SELECT nextval('quotation_number_seq') INTO next_val;
  RETURN 'COT-' || LPAD(next_val::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Tabla principal de cotizaciones
CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text NOT NULL UNIQUE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  customer_address text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  event_date date,
  status text NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador', 'enviada', 'aprobada', 'rechazada', 'facturada')),
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  tax_percentage numeric(5,2) NOT NULL DEFAULT 0,
  tax_amount numeric(10,2) NOT NULL DEFAULT 0,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  converted_sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de ítems o líneas de la cotización
CREATE TABLE IF NOT EXISTS quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  dish_id uuid REFERENCES dishes(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  price numeric(10,2) NOT NULL DEFAULT 0,
  discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Índices de búsqueda y rendimiento
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_date ON quotations(date DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items(quotation_id);

-- Políticas RLS (Row Level Security)
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select quotations"
  ON quotations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert quotations"
  ON quotations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update quotations"
  ON quotations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete quotations"
  ON quotations FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can select quotation_items"
  ON quotation_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert quotation_items"
  ON quotation_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update quotation_items"
  ON quotation_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete quotation_items"
  ON quotation_items FOR DELETE TO authenticated USING (true);
