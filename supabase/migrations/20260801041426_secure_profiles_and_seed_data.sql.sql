/*
# Secure profiles.role + seed database

## 1. Security Fix: profiles.role privilege escalation
- Problem: The existing `profiles_update_own` policy allows any authenticated user to UPDATE their own profile row, including the `role` column. A customer could change their own role to 'admin' — privilege escalation.
- Fix: Replace the UPDATE policy with one that only allows updates to non-role columns (full_name, phone, avatar_url, address). Role changes must go through a new SECURITY DEFINER function `update_user_role()` callable only by admins.

## 2. SECURITY DEFINER function for role changes
- `update_user_role(target_user_id uuid, new_role text)` — callable only by users whose own profile.role = 'admin'. Updates the target user's role. Returns the new role.
- SECURITY DEFINER so it runs with elevated privileges, bypassing RLS on profiles.
- Validates new_role is one of the allowed values.

## 3. Seed data
- Services: 12 car service offerings with Kolkata-appropriate pricing
- Spare parts: 10 common parts with stock levels
- Coupons: 3 promotional coupons
- FAQs: 8 frequently asked questions
- Blog posts: 4 blog articles
- Notifications: welcome notification for existing users
*/

-- ============================================================
-- 1. FIX: Restrict profiles UPDATE to non-role columns only
-- ============================================================

-- Drop the old permissive update policy
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- New policy: users can update their own profile, but NOT the role column
-- The WITH CHECK ensures the role column is unchanged from its current value
CREATE POLICY "profiles_update_own_non_role"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (
    SELECT p.role FROM profiles p WHERE p.id = auth.uid()
  )
);

-- ============================================================
-- 2. SECURITY DEFINER function for admin role changes
-- ============================================================

-- Drop existing function if any
DROP FUNCTION IF EXISTS update_user_role(uuid, text);

CREATE OR REPLACE FUNCTION update_user_role(target_user_id uuid, new_role text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  valid_roles text[] := ARRAY['customer', 'mechanic', 'staff', 'admin'];
BEGIN
  -- Get the caller's role
  SELECT p.role INTO caller_role
  FROM profiles p
  WHERE p.id = auth.uid();

  -- Only admins can change roles
  IF caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;

  -- Validate the new role
  IF new_role IS NULL OR NOT (new_role = ANY(valid_roles)) THEN
    RAISE EXCEPTION 'Invalid role. Must be one of: customer, mechanic, staff, admin';
  END IF;

  -- Update the target user's role
  UPDATE profiles SET role = new_role, updated_at = now()
  WHERE id = target_user_id;

  RETURN new_role;
END;
$$;

-- Grant execute to authenticated users (the function itself checks admin role)
GRANT EXECUTE ON FUNCTION update_user_role(uuid, text) TO authenticated;

-- ============================================================
-- 3. SEED DATA
-- ============================================================

-- 3a. Services (12 services)
INSERT INTO services (name, description, category, base_price, duration_minutes, is_active, image_url) VALUES
('Basic Service', 'Oil change, oil filter replacement, air filter cleaning, and 20-point inspection', 'periodic', 1499, 90, true, ''),
('Full Service', 'Comprehensive service including oil change, all filters, brake check, wheel alignment, and 40-point inspection', 'periodic', 3999, 180, true, ''),
('AC Service & Repair', 'AC gas refill, compressor check, cooling performance test, and vent cleaning', 'ac', 1999, 120, true, ''),
('Tyre Replacement & Alignment', 'Tyre rotation, wheel balancing, alignment, and tread depth check', 'tyres', 599, 60, true, ''),
('Premium Car Wash', 'Exterior wash, interior vacuum, dashboard polish, and tyre dressing', 'wash', 799, 90, true, ''),
('Battery Check & Replacement', 'Battery health test, terminal cleaning, and replacement if needed', 'electrical', 499, 30, true, ''),
('Brake Service', 'Brake pad inspection, disc cleaning, brake fluid top-up, and handbrake adjustment', 'repair', 1799, 90, true, ''),
('Engine Diagnostics', 'Computerised OBD-II scan, error code reading, and engine performance report', 'inspection', 999, 60, true, ''),
('Clutch Repair', 'Clutch plate inspection, replacement, and gear smoothness test', 'repair', 4999, 240, true, ''),
('Bodywork & Dent Repair', 'Dent removal, panel beating, rust treatment, and surface preparation', 'bodywork', 2999, 180, true, ''),
('Headlight Restoration', 'Headlight fog removal, UV coating, and bulb brightness check', 'electrical', 899, 45, true, ''),
('Complete Detailing Package', 'Full exterior ceramic wash, interior deep clean, engine bay cleaning, and tyre dressing', 'wash', 3499, 240, true, '')
ON CONFLICT DO NOTHING;

-- 3b. Spare Parts (10 parts)
INSERT INTO spare_parts (name, part_number, category, description, quantity, unit_price, reorder_level, supplier, location) VALUES
('Engine Oil - 5W30 Synthetic (4L)', 'EO-5W30-4L', 'engine', 'Fully synthetic engine oil for petrol and diesel engines', 45, 1899, 10, 'Castrol India', 'Rack A-1'),
('Oil Filter - Maruti/Hyundai', 'OF-MH-001', 'filter', 'OEM oil filter compatible with Maruti and Hyundai models', 80, 249, 20, 'Bosch Auto', 'Rack A-2'),
('Air Filter - Universal', 'AF-UNI-100', 'filter', 'High-flow air filter for improved engine performance', 60, 349, 15, 'Mann-Filter', 'Rack A-3'),
('Brake Pad Set - Front', 'BP-F-200', 'brake', 'Front brake pad set for sedans and hatchbacks', 30, 1299, 8, 'Brembo India', 'Rack B-1'),
('Brake Pad Set - Rear', 'BP-R-200', 'brake', 'Rear brake pad set for sedans and hatchbacks', 25, 1099, 8, 'Brembo India', 'Rack B-2'),
('Car Battery - 12V 60Ah', 'BAT-12-60', 'electrical', 'Maintenance-free 12V 60Ah car battery with 18-month warranty', 18, 4499, 5, 'Exide Industries', 'Rack C-1'),
('AC Compressor - Universal', 'ACC-UNI-500', 'ac', 'AC compressor for compact and mid-size cars', 8, 8999, 3, 'Denso India', 'Rack C-2'),
('Spark Plug Set - Iridium', 'SP-IR-400', 'electrical', 'Set of 4 iridium spark plugs for better fuel efficiency', 50, 599, 12, 'NGK Spark Plugs', 'Rack D-1'),
('Tyre - 175/65 R14', 'TY-175-14', 'tyres', 'Tubeless radial tyre for Maruti Swift, Wagon R, and similar', 32, 3499, 8, 'MRF Tyres', 'Rack E-1'),
('Coolant - 1L', 'CL-1L-001', 'engine', 'Ready-to-use engine coolant for all weather conditions', 40, 299, 10, 'Castrol India', 'Rack A-4')
ON CONFLICT DO NOTHING;

-- 3c. Coupons (3 coupons)
INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, used_count, valid_from, valid_until, is_active) VALUES
('WELCOME100', '₹100 off on your first service booking', 'fixed', 100, 499, NULL, 1000, 0, '2026-01-01T00:00:00', '2026-12-31T23:59:59', true),
('SAVE10', '10% off on all services above ₹2000', 'percentage', 10, 2000, 500, 500, 0, '2026-01-01T00:00:00', '2026-12-31T23:59:59', true),
('FESTIVE500', '₹500 off on full service and above', 'fixed', 500, 3999, NULL, 200, 0, '2026-01-01T00:00:00', '2026-12-31T23:59:59', true)
ON CONFLICT DO NOTHING;

-- 3d. FAQs (8 FAQs)
INSERT INTO faqs (question, answer, category, sort_order, is_active) VALUES
('How do I book a car service?', 'You can book a service online through our website. Simply create an account, add your vehicle, choose a service, select a date and time slot, and confirm your booking. You will receive a confirmation notification immediately.', 'booking', 1, true),
('Do you offer pickup and drop service?', 'Yes! We offer free pickup and drop within Newtown, Hatisala, and nearby areas in Kolkata. You can select this option while booking your service for a small fee of ₹299 per trip.', 'service', 2, true),
('What is the warranty on your repairs?', 'All repair work done at A2Z Car Workshop comes with a 30-day warranty. If you face any issue with the same repair within 30 days, we will fix it free of charge.', 'service', 3, true),
('How long does a basic service take?', 'A basic service typically takes 90 minutes. A full service takes about 3 hours. You can track the status of your service in real-time from your customer dashboard.', 'service', 4, true),
('Do you use genuine spare parts?', 'Yes, we only use genuine OEM or equivalent quality spare parts from trusted suppliers like Bosch, Brembo, Exide, MRF, and Castrol. We never use counterfeit or substandard parts.', 'parts', 5, true),
('How can I pay for my service?', 'You can pay online using UPI, credit/debit card, or net banking through our secure payment gateway. You can also pay in person at our workshop after the service is completed.', 'payment', 6, true),
('Where is A2Z Car Workshop located?', 'We are located at Six Lane, Newtown, Hatisala, Kolkata, West Bengal 700135. We are open Monday to Saturday from 8:00 AM to 8:00 PM and Sunday from 9:00 AM to 5:00 PM.', 'general', 7, true),
('Can I cancel my booking?', 'Yes, you can cancel your booking from your customer dashboard before the service starts. Bookings that are already in progress or completed cannot be cancelled.', 'booking', 8, true)
ON CONFLICT DO NOTHING;

-- 3e. Blog Posts (4 posts)
INSERT INTO blog_posts (title, slug, excerpt, content, cover_image, author_id, category, tags, is_published, published_at, views) VALUES
('5 Signs Your Car Needs Immediate Service', '5-signs-car-needs-service', 'Learn the warning signs that mean your car needs professional attention before a small problem becomes a costly repair.', 'Regular maintenance is key to keeping your car running smoothly. Here are 5 signs you should not ignore: 1) Strange noises from the engine or brakes. 2) Dashboard warning lights staying on. 3) Reduced fuel efficiency. 4) Vibrations while driving. 5) Difficulty starting the engine. If you notice any of these, book a service at A2Z Car Workshop, Newtown, Kolkata today.', '', NULL, 'maintenance', ARRAY['maintenance', 'tips', 'kolkata'], true, now(), 0),
('How to Extend Your Car Battery Life in Kolkata Weather', 'extend-car-battery-life-kolkata', 'Kolkata heat and humidity can take a toll on your car battery. Follow these tips to maximise battery life.', 'The hot and humid climate in Kolkata can reduce your car battery life. Tips: 1) Park in shade when possible. 2) Check battery terminals monthly for corrosion. 3) Avoid short trips that do not allow the battery to fully charge. 4) Get a free battery health check at A2Z Car Workshop every 6 months. 5) Replace batteries older than 3 years proactively.', '', NULL, 'tips', ARRAY['battery', 'tips', 'kolkata'], true, now(), 0),
('Why Regular Oil Change Matters for Your Engine', 'why-regular-oil-change-matters', 'Engine oil is the lifeblood of your car. Discover why regular oil changes are the most important maintenance task.', 'Engine oil lubricates, cools, and cleans your engine. Over time, oil breaks down and becomes contaminated with dirt and metal particles. Old oil can cause engine wear, reduced performance, and costly damage. We recommend changing oil every 10,000 km or every 6 months, whichever comes first. At A2Z Car Workshop, we use only premium synthetic oils for maximum engine protection.', '', NULL, 'maintenance', ARRAY['oil-change', 'engine', 'maintenance'], true, now(), 0),
('AC Service Guide for Kolkata Summers', 'ac-service-guide-kolkata-summers', 'Keep your car cool during Kolkata hot summers with these AC maintenance tips and service recommendations.', 'Kolkata summers can be brutal, and a well-functioning car AC is essential. Signs your AC needs service: 1) Weak airflow from vents. 2) AC takes too long to cool. 3) Unusual smells when AC is on. 4) Strange noises from the compressor. Get your AC serviced at A2Z Car Workshop, Newtown — we offer gas refill, compressor check, and full cooling performance testing.', '', NULL, 'tips', ARRAY['ac', 'summer', 'kolkata'], true, now(), 0)
ON CONFLICT DO NOTHING;

-- 3f. Welcome notifications for existing users
INSERT INTO notifications (user_id, title, message, type, is_read, link)
SELECT id, 'Welcome to A2Z Car Workshop!', 'Thank you for joining A2Z Car Workshop, Newtown Kolkata. Book your first service today and get ₹100 off with code WELCOME100.', 'info', false, '/customer/book'
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM notifications n WHERE n.user_id = profiles.id AND n.title = 'Welcome to A2Z Car Workshop!'
)
ON CONFLICT DO NOTHING;
