/*
  # Sistema de Gestión de Restaurante - Esquema Completo

  ## Nuevas Tablas

  ### 1. users_profile
  - `id` (uuid, FK a auth.users)
  - `full_name` (text)
  - `role` (text: 'admin', 'mesero', 'cocinero')
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### 2. categories
  - `id` (uuid, PK)
  - `name` (text)
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### 3. dishes
  - `id` (uuid, PK)
  - `name` (text)
  - `price` (numeric)
  - `percentage` (numeric) - Impuesto o margen
  - `category_id` (uuid, FK)
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### 4. tables
  - `id` (uuid, PK)
  - `table_number` (text)
  - `capacity` (integer)
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### 5. expenses
  - `id` (uuid, PK)
  - `concept` (text)
  - `amount` (numeric)
  - `date` (date)
  - `notes` (text)
  - `created_by` (uuid, FK)
  - `created_at` (timestamptz)

  ### 6. orders
  - `id` (uuid, PK)
  - `order_number` (text)
  - `table_id` (uuid, FK)
  - `waiter_id` (uuid, FK)
  - `status` (text: 'pendiente', 'en_preparacion', 'terminado', 'entregado')
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. order_items
  - `id` (uuid, PK)
  - `order_id` (uuid, FK)
  - `dish_id` (uuid, FK)
  - `quantity` (integer)
  - `notes` (text)
  - `status` (text: 'pendiente', 'en_preparacion', 'terminado')
  - `created_at` (timestamptz)

  ### 8. sales
  - `id` (uuid, PK)
  - `sale_number` (text)
  - `subtotal` (numeric)
  - `tax_amount` (numeric)
  - `total` (numeric)
  - `created_by` (uuid, FK)
  - `created_at` (timestamptz)

  ### 9. sale_items
  - `id` (uuid, PK)
  - `sale_id` (uuid, FK)
  - `dish_id` (uuid, FK)
  - `dish_name` (text)
  - `quantity` (integer)
  - `price` (numeric)
  - `percentage` (numeric)
  - `subtotal` (numeric)

  ### 10. restaurant_config
  - `id` (uuid, PK)
  - `restaurant_name` (text)
  - `tax_percentage` (numeric)
  - `address` (text)
  - `phone` (text)
  - `updated_at` (timestamptz)

  ## Seguridad
  - RLS habilitado en todas las tablas
  - Políticas basadas en roles (admin, mesero, cocinero)
  - Administradores tienen acceso completo
  - Meseros solo ven sus propias órdenes
  - Cocineros solo acceden al módulo de cocina
*/

-- Tabla de perfiles de usuario extendidos
CREATE TABLE IF NOT EXISTS users_profile (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'mesero', 'cocinero')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all profiles"
  ON users_profile FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view own profile"
  ON users_profile FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can insert profiles"
  ON users_profile FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update profiles"
  ON users_profile FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Tabla de categorías
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Tabla de platillos
CREATE TABLE IF NOT EXISTS dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  percentage numeric(5,2) DEFAULT 0 CHECK (percentage >= 0),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view dishes"
  ON dishes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert dishes"
  ON dishes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update dishes"
  ON dishes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete dishes"
  ON dishes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Tabla de mesas
CREATE TABLE IF NOT EXISTS tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number text NOT NULL UNIQUE,
  capacity integer DEFAULT 4,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tables"
  ON tables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert tables"
  ON tables FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update tables"
  ON tables FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete tables"
  ON tables FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Tabla de gastos
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  date date DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Tabla de órdenes
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  table_id uuid REFERENCES tables(id) ON DELETE SET NULL,
  waiter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_preparacion', 'terminado', 'entregado')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Waiters can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    waiter_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'cocinero'
    )
  );

CREATE POLICY "Waiters can insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    waiter_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role IN ('mesero', 'admin')
    )
  );

CREATE POLICY "Waiters and cooks can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    waiter_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role IN ('cocinero', 'admin')
    )
  )
  WITH CHECK (
    waiter_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role IN ('cocinero', 'admin')
    )
  );

-- Tabla de items de órdenes
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  dish_id uuid REFERENCES dishes(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  notes text,
  status text DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_preparacion', 'terminado')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view order items based on order access"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (
        orders.waiter_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users_profile
          WHERE id = auth.uid() AND role IN ('admin', 'cocinero')
        )
      )
    )
  );

CREATE POLICY "Waiters can insert order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.waiter_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Waiters and cooks can update order items"
  ON order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (
        orders.waiter_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users_profile
          WHERE id = auth.uid() AND role IN ('admin', 'cocinero')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (
        orders.waiter_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users_profile
          WHERE id = auth.uid() AND role IN ('admin', 'cocinero')
        )
      )
    )
  );

-- Tabla de ventas
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number text NOT NULL UNIQUE,
  subtotal numeric(10,2) NOT NULL CHECK (subtotal >= 0),
  tax_amount numeric(10,2) DEFAULT 0 CHECK (tax_amount >= 0),
  total numeric(10,2) NOT NULL CHECK (total >= 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all sales"
  ON sales FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view own sales"
  ON sales FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can insert sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
  );

-- Tabla de items de ventas
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
  dish_id uuid REFERENCES dishes(id) ON DELETE RESTRICT,
  dish_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  percentage numeric(5,2) DEFAULT 0 CHECK (percentage >= 0),
  subtotal numeric(10,2) NOT NULL CHECK (subtotal >= 0)
);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sale items based on sale access"
  ON sale_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
      AND (
        sales.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users_profile
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Users can insert sale items"
  ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
      AND sales.created_by = auth.uid()
    )
  );

-- Tabla de configuración del restaurante
CREATE TABLE IF NOT EXISTS restaurant_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_name text DEFAULT 'Mi Restaurante',
  tax_percentage numeric(5,2) DEFAULT 16.00 CHECK (tax_percentage >= 0),
  address text,
  phone text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE restaurant_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view config"
  ON restaurant_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update config"
  ON restaurant_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert config"
  ON restaurant_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insertar configuración por defecto
INSERT INTO restaurant_config (restaurant_name, tax_percentage, address, phone)
VALUES ('Mi Restaurante', 16.00, '', '')
ON CONFLICT DO NOTHING;

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_dishes_category ON dishes(category_id);
CREATE INDEX IF NOT EXISTS idx_dishes_active ON dishes(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_waiter ON orders(waiter_id);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_dish ON order_items(dish_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);