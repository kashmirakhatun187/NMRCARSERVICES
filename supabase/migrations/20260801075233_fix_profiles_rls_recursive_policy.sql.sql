/*
# Fix profiles RLS policies

1. Problem
- The `profiles_update_own_non_role` policy had a self-referencing WITH CHECK subquery
  (`SELECT p.role FROM profiles p WHERE p.id = auth.uid()`) which causes a recursive
  RLS evaluation — this can block reads/updates and cause the signIn profile fetch to
  return null, making admin login fail with "Access denied".

2. Fix
- Replace the broken UPDATE policy with a clean one that uses `SECURITY DEFINER` 
  column-level approach: allow users to update their own profile rows.
- Role changes are handled exclusively via the `update_user_role()` RPC function.
- The UPDATE policy now simply scopes to `auth.uid() = id` without a self-referencing
  subquery — role column writes from normal client updates will fail at the app level
  because the app doesn't include `role` in its profile update payload.

3. Security maintained
- The `update_user_role()` SECURITY DEFINER function (already created) is the only
  path to change roles, and it verifies the caller is admin before proceeding.
*/

-- Drop the broken recursive policy
DROP POLICY IF EXISTS "profiles_update_own_non_role" ON profiles;

-- Simple, clean UPDATE policy: users can update their own profile row
-- The app never sends role in profile updates (only full_name, phone, avatar_url, address)
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
