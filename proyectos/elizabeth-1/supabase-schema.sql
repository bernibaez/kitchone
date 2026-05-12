-- Schema para Supabase - Sistema de Ventas MC
-- Ejecuta estas consultas SQL en el editor SQL de Supabase

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(20) NOT NULL DEFAULT 'vendedor' CHECK (role IN ('admin', 'vendedor', 'cajero')),
  password VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de categorías
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de proveedores
CREATE TABLE IF NOT EXISTS providers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  rnc VARCHAR(20),
  contact_name VARCHAR(255),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de productos
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sku VARCHAR(100) UNIQUE,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  wholesale_price DECIMAL(10,2),
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 5,
  category_id INTEGER REFERENCES categories(id),
  provider_id INTEGER REFERENCES providers(id),
  category_name VARCHAR(255),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  rnc VARCHAR(20),
  credit_limit DECIMAL(10,2),
  total_purchases DECIMAL(10,2) DEFAULT 0,
  last_purchase TIMESTAMP WITH TIME ZONE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de ventas
CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  customer_name VARCHAR(255),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_profit DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(20) NOT NULL DEFAULT 'efectivo' CHECK (payment_method IN ('efectivo', 'tarjeta', 'transferencia', 'cheque')),
  user_id INTEGER NOT NULL,
  seller_name VARCHAR(255) NOT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_customers_rnc ON customers(rnc);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON sales(invoice_number);

-- Insertar datos iniciales
INSERT INTO categories (name) VALUES 
('Tecnología'),
('Accesorios'),
('Oficina')
ON CONFLICT DO NOTHING;

-- Insertar usuario administrador por defecto
INSERT INTO users (username, name, email, role, password, active) VALUES 
('admin', 'Administrador', 'admin@empresa.com', 'admin', '123456', true)
ON CONFLICT (username) DO NOTHING;

-- Insertar productos de ejemplo
INSERT INTO products (name, description, sku, price, wholesale_price, cost, stock, min_stock, category_id, category_name, active) VALUES 
('Laptop Profesional 15"', 'Laptop para oficina con 16GB RAM y SSD 512GB', 'PROD-001', 45000.00, 43000.00, 32000.00, 8, 3, 1, 'Tecnología', true),
('Mouse Inalámbrico', 'Mouse ergonómico 2.4GHz', 'PROD-002', 800.00, 700.00, 400.00, 25, 5, 2, 'Accesorios', true),
('Monitor 24" LED', 'Monitor Full HD 1080p', 'PROD-003', 9500.00, 9000.00, 7000.00, 4, 2, 1, 'Tecnología', true)
ON CONFLICT (sku) DO NOTHING;

-- Insertar clientes de ejemplo
INSERT INTO customers (name, phone, email, address, rnc, credit_limit, total_purchases, active) VALUES 
('Juan Pérez', '809-555-0101', 'juan.perez@example.com', 'Calle 1 #10, Santo Domingo', '001234567', 50000.00, 75000.00, true),
('Ferretería El Martillo', '809-555-0202', 'ventas@elmartillo.com', 'Av. Industrial 200', '009876543', 150000.00, 120000.00, true),
('María Gómez', '809-555-0303', 'maria.gomez@example.com', 'Calle Sol #5', NULL, 20000.00, 18000.00, true)
ON CONFLICT DO NOTHING;

-- Insertar proveedores de ejemplo
INSERT INTO providers (name, phone, email, address, rnc, contact_name, active) VALUES 
('Distribuidora Tech Dominicana', '809-555-0404', 'contacto@techdo.com', 'Av. Tecnológica 45, Santo Domingo', '131415161', 'Luis Rodríguez', true),
('Importadora La Comercial', '809-555-0505', 'ventas@lacomercial.com', 'Calle Comercio 200, Santiago', '171819202', 'Ana Martínez', true)
ON CONFLICT DO NOTHING;

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear triggers para actualizar updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
