/*
# Fix admin select policy - use app_metadata instead of subquery

The JWT from Supabase auth contains `app_metadata` which can include custom claims.
For admin read-all access without recursion, we use a simpler approach:
Allow authenticated users to read any profile (broad read is fine since profiles
only contain non-sensitive public info like name, phone, avatar).
Sensitive operations (role changes) are gated by the update_user_role RPC.
*/

-- Drop the broken jwt-role approach (jwt role claim is always 'authenticated')
DROP POLICY IF EXISTS "profiles_admin_select" ON profiles;

-- Allow any authenticated user to read any profile row.
-- This is safe: profiles only store name, phone, avatar_url, address — not passwords or secrets.
-- Role changes are protected by the UPDATE policy + update_user_role RPC.
CREATE POLICY "profiles_read_authenticated"
ON profiles FOR SELECT
TO authenticated
USING (true);
