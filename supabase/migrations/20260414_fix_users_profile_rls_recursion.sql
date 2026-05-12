-- Fix infinite recursion in users_profile RLS policies
-- The original policies used EXISTS subqueries that referenced the same table,
-- causing infinite recursion when evaluating permissions.

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON users_profile;
DROP POLICY IF EXISTS "Users can view own profile" ON users_profile;
DROP POLICY IF EXISTS "Admins can insert profiles" ON users_profile;
DROP POLICY IF EXISTS "Admins can update profiles" ON users_profile;

-- Create new non-recursive policies
-- For SELECT operations: users can see their own profile
CREATE POLICY "Users can view own profile" ON users_profile FOR SELECT
  TO authenticated USING (id = auth.uid());

-- For INSERT operations: users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile" ON users_profile FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());

-- For UPDATE operations: users can update their own profile
CREATE POLICY "Users can update own profile" ON users_profile FOR UPDATE
  TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Note: Admin operations should be handled at the application level
-- using service role key or by implementing proper role-based checks
-- in the application code rather than complex RLS policies
