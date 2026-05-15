ALTER TABLE users_profile ADD COLUMN allowed_modules text[] DEFAULT '{}';

-- Migrar módulos basados en el rol para los usuarios existentes
UPDATE users_profile
SET allowed_modules = ARRAY['dashboard', 'users', 'customers', 'categories', 'dishes', 'tables', 'expenses', 'sales', 'orders', 'kitchen', 'history', 'reports', 'config']
WHERE role = 'admin';

UPDATE users_profile
SET allowed_modules = ARRAY['dashboard', 'customers', 'sales', 'orders']
WHERE role = 'mesero';

UPDATE users_profile
SET allowed_modules = ARRAY['dashboard', 'kitchen']
WHERE role = 'cocinero';
