-- Tabla de aperturas de caja
CREATE TABLE IF NOT EXISTS cash_openings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_number text NOT NULL UNIQUE,
  opening_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (opening_amount >= 0),
  notes text,
  opened_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_at timestamptz DEFAULT now()
);

ALTER TABLE cash_openings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all cash openings"
  ON cash_openings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view own cash openings"
  ON cash_openings FOR SELECT
  TO authenticated
  USING (opened_by = auth.uid());

CREATE POLICY "Authenticated users can insert cash openings"
  ON cash_openings FOR INSERT
  TO authenticated
  WITH CHECK (opened_by = auth.uid());

-- Tabla de cierres de caja
CREATE TABLE IF NOT EXISTS cash_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_number text NOT NULL UNIQUE,
  opening_id uuid REFERENCES cash_openings(id) ON DELETE SET NULL,
  total_sales numeric(10,2) NOT NULL DEFAULT 0 CHECK (total_sales >= 0),
  cash_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (cash_amount >= 0),
  transaction_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (transaction_amount >= 0),
  card_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (card_amount >= 0),
  expected_cash numeric(10,2) NOT NULL DEFAULT 0 CHECK (expected_cash >= 0),
  difference numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at timestamptz DEFAULT now()
);

ALTER TABLE cash_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all cash closings"
  ON cash_closings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view own cash closings"
  ON cash_closings FOR SELECT
  TO authenticated
  USING (closed_by = auth.uid());

CREATE POLICY "Authenticated users can insert cash closings"
  ON cash_closings FOR INSERT
  TO authenticated
  WITH CHECK (closed_by = auth.uid());

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_cash_openings_opened_at ON cash_openings(opened_at);
CREATE INDEX IF NOT EXISTS idx_cash_openings_opened_by ON cash_openings(opened_by);
CREATE INDEX IF NOT EXISTS idx_cash_closings_closed_at ON cash_closings(closed_at);
CREATE INDEX IF NOT EXISTS idx_cash_closings_closed_by ON cash_closings(closed_by);
CREATE INDEX IF NOT EXISTS idx_cash_closings_opening_id ON cash_closings(opening_id);

-- Secuencia para números de apertura de caja
CREATE SEQUENCE IF NOT EXISTS cash_opening_number_seq;

-- Función para obtener el siguiente número de apertura
CREATE OR REPLACE FUNCTION get_next_cash_opening_number()
RETURNS text AS $$
BEGIN
  RETURN 'CA-' || LPAD(nextval('cash_opening_number_seq')::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Secuencia para números de cierre de caja
CREATE SEQUENCE IF NOT EXISTS cash_closing_number_seq;

-- Función para obtener el siguiente número de cierre
CREATE OR REPLACE FUNCTION get_next_cash_closing_number()
RETURNS text AS $$
BEGIN
  RETURN 'CC-' || LPAD(nextval('cash_closing_number_seq')::text, 4, '0');
END;
$$ LANGUAGE plpgsql;
