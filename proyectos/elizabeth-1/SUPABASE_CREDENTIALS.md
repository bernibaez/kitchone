# Cómo obtener tus credenciales de Supabase

## 1. Obtener la URL de Supabase:
1. Ve a [supabase.com](https://supabase.com)
2. Inicia sesión y selecciona tu proyecto
3. Ve a Settings → API
4. Copia la "Project URL" (ej: https://abcdefgh.supabase.co)

## 2. Obtener la Anonymous Key:
En la misma sección de API:
1. Copia la "anon public" key
2. Comienza con: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

## 3. Configurar en Netlify:
1. Ve a netlify.com → Tu sitio → Site settings → Environment variables
2. Agrega:
   - VITE_SUPABASE_URL = (tu Project URL)
   - VITE_SUPABASE_ANON_KEY = (tu anon key)

## 4. Redesplegar:
Después de configurar las variables, Netlify automáticamente redesplegará tu sitio.

## 5. Verificar usuarios en Supabase:
Asegúrate de que tienes usuarios creados en tu tabla "users":
1. Ve a Supabase → Table Editor
2. Selecciona la tabla "users"
3. Verifica que tengas al menos un usuario con active=true

Usuario por defecto:
- username: admin@empresa.com
- password: 123456
- active: true
