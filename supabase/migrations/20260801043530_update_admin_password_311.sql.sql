/*
# Update admin password for abbasmolla311@gmail.com

1. Purpose
- Set the password for the existing admin account abbasmolla311@gmail.com to Admin@311.
- This account already has role = 'admin' in profiles.

2. Changes
- Update auth.users encrypted_password for this email.
- Ensure profile role is 'admin'.
*/

UPDATE auth.users
SET encrypted_password = crypt('Admin@311', gen_salt('bf', 10)),
    updated_at = now(),
    email_confirmed_at = now()
WHERE email = 'abbasmolla311@gmail.com';

-- Ensure admin role
UPDATE profiles SET role = 'admin', updated_at = now()
WHERE id = (SELECT id FROM auth.users WHERE email = 'abbasmolla311@gmail.com');
