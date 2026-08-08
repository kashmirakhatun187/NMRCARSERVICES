/*
# Create admin user abbasmolla456@gmail.com

1. Purpose
- Create a dedicated admin account with email abbasmolla456@gmail.com and password Admin@1234.
- This user will have full admin access to the A2Z Car Workshop admin panel.

2. Changes
- Insert a new row into auth.users with an encrypted password (only if email doesn't already exist).
- Insert a matching row into public.profiles with role = 'admin'.
*/

-- Insert auth user with bcrypt-hashed password (only if not exists)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'abbasmolla456@gmail.com',
  crypt('Admin@1234', gen_salt('bf', 10)),
  now(),
  now(),
  now(),
  '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'abbasmolla456@gmail.com');

-- Insert profile with admin role
INSERT INTO profiles (id, full_name, phone, role)
SELECT id, 'Admin', '', 'admin'
FROM auth.users
WHERE email = 'abbasmolla456@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = 'Admin';
