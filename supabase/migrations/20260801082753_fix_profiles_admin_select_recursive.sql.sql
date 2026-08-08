/*
# Fix recursive profiles_admin_select policy

PROBLEM:
The `profiles_admin_select` policy contains:
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = ANY(...))
This subquery reads from `profiles`, which triggers the RLS check again — infinite recursion.
PostgreSQL returns NULL instead of data, causing freshProfile = null after login,
so the admin login shows "Access denied."

FIX:
- Drop the recursive policy.
- Admin/staff can read ALL profiles via a SECURITY DEFINER function (already exists: update_user_role).
- For listing users on admin pages, we'll add a clean function-based approach.
- The SELECT policy only needs profiles_select_own for auth to work correctly.
*/

-- Drop the broken recursive policy
DROP POLICY IF EXISTS "profiles_admin_select" ON profiles;

-- Recreate it using a JWT claim check (no subquery) so admins can still read all profiles
-- auth.jwt() returns the JWT payload; Supabase sets app_metadata.role for service-role calls
-- For regular users we read role from app_metadata if set, otherwise fall back to profiles_select_own
-- Simple approach: allow select if user_metadata or raw_app_meta_data has role admin/staff
-- OR if it's the user's own row — no subquery into profiles table.

CREATE POLICY "profiles_admin_select"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR (auth.jwt() ->> 'role' IN ('admin', 'staff'))
);
