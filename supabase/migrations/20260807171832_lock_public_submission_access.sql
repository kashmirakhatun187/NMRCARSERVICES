/*
# Lock public submission data to its intended access

## Changes
1. Inquiries remain writable by visitors, but private inquiry rows are no longer readable by the public.
2. Only authenticated admin profiles can read, update, or delete inquiries.
3. Published site ratings remain readable publicly; only authenticated admin profiles can moderate or delete them.
4. Public visitors can still submit inquiries and ratings without logging in.

## Security
All rules use the authenticated user's admin role from the profiles table. Public users do not receive access to customer contact details or inquiry messages.
*/

DROP POLICY IF EXISTS "anon_select_inquiries" ON inquiries;
CREATE POLICY "admins_select_inquiries" ON inquiries FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "admin_update_inquiries" ON inquiries;
CREATE POLICY "admins_update_inquiries" ON inquiries FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "admin_delete_inquiries" ON inquiries;
CREATE POLICY "admins_delete_inquiries" ON inquiries FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "admin_update_ratings" ON site_ratings;
CREATE POLICY "admins_update_ratings" ON site_ratings FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "admin_delete_ratings" ON site_ratings;
CREATE POLICY "admins_delete_ratings" ON site_ratings FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
