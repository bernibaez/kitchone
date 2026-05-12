-- Add payment fields to sales table
-- Migration: 20260205_add_payment_fields_to_sales.sql

ALTER TABLE sales 
ADD COLUMN payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'transaction')),
ADD COLUMN money_received numeric(10,2) DEFAULT 0 CHECK (money_received >= 0),
ADD COLUMN change numeric(10,2) DEFAULT 0 CHECK (change >= 0);

-- Add comments
COMMENT ON COLUMN sales.payment_method IS 'Método de pago utilizado: efectivo, tarjeta o transferencia';
COMMENT ON COLUMN sales.money_received IS 'Dinero recibido (solo para efectivo)';
COMMENT ON COLUMN sales.change IS 'Cambio devuelto (solo para efectivo)';
