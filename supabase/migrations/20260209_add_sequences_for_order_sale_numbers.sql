-- Crear secuencias para números de orden y venta
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS sale_number_seq START 1;

-- Función para obtener el siguiente número de orden formateado
CREATE OR REPLACE FUNCTION get_next_order_number() RETURNS text AS $$
DECLARE
    next_num integer;
BEGIN
    SELECT nextval('order_number_seq') INTO next_num;
    RETURN 'ORD-' || lpad(next_num::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Función para obtener el siguiente número de venta formateado
CREATE OR REPLACE FUNCTION get_next_sale_number() RETURNS text AS $$
DECLARE
    next_num integer;
BEGIN
    SELECT nextval('sale_number_seq') INTO next_num;
    RETURN 'FAC-' || lpad(next_num::text, 6, '0');
END;
$$ LANGUAGE plpgsql;
