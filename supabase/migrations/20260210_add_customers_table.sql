-- Tabla de clientes
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  phone text,
  address text,
  notes text,
  is_active boolean DEFAULT true,
  total_orders integer DEFAULT 0,
  total_spent numeric(10,2) DEFAULT 0,
  last_order_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tabla de relación cliente-venta (para historial de compras)
CREATE TABLE IF NOT EXISTS customer_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view customer sales based on access"
  ON customer_sales FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = customer_sales.sale_id
      AND (
        sales.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users_profile
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Users can insert customer sales"
  ON customer_sales FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = customer_sales.sale_id
      AND sales.created_by = auth.uid()
    )
  );

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customer_sales_customer ON customer_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_sales_sale ON customer_sales(sale_id);

-- Función para actualizar estadísticas del cliente
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar estadísticas del cliente cuando se inserta una relación cliente-venta
  IF TG_OP = 'INSERT' THEN
    UPDATE customers
    SET
      total_orders = total_orders + 1,
      last_order_date = NEW.created_at,
      updated_at = now()
    WHERE id = NEW.customer_id;

    -- Actualizar total gastado
    UPDATE customers
    SET total_spent = (
      SELECT COALESCE(SUM(s.total), 0)
      FROM customer_sales cs
      JOIN sales s ON cs.sale_id = s.id
      WHERE cs.customer_id = customers.id
    )
    WHERE id = NEW.customer_id;

  -- Actualizar estadísticas cuando se elimina una relación
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE customers
    SET
      total_orders = GREATEST(total_orders - 1, 0),
      updated_at = now()
    WHERE id = OLD.customer_id;

    -- Recalcular total gastado
    UPDATE customers
    SET total_spent = (
      SELECT COALESCE(SUM(s.total), 0)
      FROM customer_sales cs
      JOIN sales s ON cs.sale_id = s.id
      WHERE cs.customer_id = customers.id
    )
    WHERE id = OLD.customer_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar estadísticas automáticamente
CREATE TRIGGER update_customer_stats_trigger
  AFTER INSERT OR DELETE ON customer_sales
  FOR EACH ROW EXECUTE FUNCTION update_customer_stats();
