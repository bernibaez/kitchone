-- Permite que los administradores consulten y actualicen todos los perfiles sin políticas RLS recursivas.
-- La función SECURITY DEFINER evita el ciclo al evaluar permisos sobre users_profile.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users_profile
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "Users can view own profile" ON users_profile;
DROP POLICY IF EXISTS "Users can insert own profile" ON users_profile;
DROP POLICY IF EXISTS "Users can update own profile" ON users_profile;

CREATE POLICY "users_profile_select" ON users_profile FOR SELECT
  TO authenticated
  USING (public.is_admin() OR id = auth.uid());

CREATE POLICY "users_profile_insert_own" ON users_profile FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_profile_update" ON users_profile FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR id = auth.uid())
  WITH CHECK (public.is_admin() OR id = auth.uid());
