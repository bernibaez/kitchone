-- Script para crear usuarios de prueba para cada rol
-- Este script debe ejecutarse con el SERVICE_ROLE_KEY para poder insertar en auth.users

-- NOTA: Este script asume que estás ejecutándolo desde el SQL Editor de Supabase
-- con el service role, o usando la API de Supabase con el service role key.

-- Crear usuario Administrador
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@restaurant.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  '{"full_name": "Administrador Principal"}',
  now(),
  now()
) ON CONFLICT (email) DO NOTHING;

-- Crear usuario Mesero
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'mesero@restaurant.com',
  crypt('mesero123', gen_salt('bf')),
  now(),
  '{"full_name": "Juan Mesero"}',
  now(),
  now()
) ON CONFLICT (email) DO NOTHING;

-- Crear usuario Cocinero
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'cocinero@restaurant.com',
  crypt('cocinero123', gen_salt('bf')),
  now(),
  '{"full_name": "Carlos Cocinero"}',
  now(),
  now()
) ON CONFLICT (email) DO NOTHING;

-- Crear usuario Cajero
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'cajero@restaurant.com',
  crypt('cajero123', gen_salt('bf')),
  now(),
  '{"full_name": "Maria Cajera"}',
  now(),
  now()
) ON CONFLICT (email) DO NOTHING;

-- Crear perfiles en users_profile para cada usuario
-- Administrador
INSERT INTO users_profile (id, full_name, role, is_active)
SELECT 
  id,
  'Administrador Principal',
  'admin',
  true
FROM auth.users 
WHERE email = 'admin@restaurant.com'
ON CONFLICT (id) DO NOTHING;

-- Mesero
INSERT INTO users_profile (id, full_name, role, is_active)
SELECT 
  id,
  'Juan Mesero',
  'mesero',
  true
FROM auth.users 
WHERE email = 'mesero@restaurant.com'
ON CONFLICT (id) DO NOTHING;

-- Cocinero
INSERT INTO users_profile (id, full_name, role, is_active)
SELECT 
  id,
  'Carlos Cocinero',
  'cocinero',
  true
FROM auth.users 
WHERE email = 'cocinero@restaurant.com'
ON CONFLICT (id) DO NOTHING;

-- Cajero
INSERT INTO users_profile (id, full_name, role, is_active)
SELECT 
  id,
  'Maria Cajera',
  'cajero',
  true
FROM auth.users 
WHERE email = 'cajero@restaurant.com'
ON CONFLICT (id) DO NOTHING;
