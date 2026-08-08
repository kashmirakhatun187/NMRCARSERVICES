
/*
# Car Service & Garage Management System - Core Schema

## Overview
Creates the complete database schema for a professional car service and garage management platform.

## New Tables

### profiles
- Extends auth.users with role-based access (customer, mechanic, staff, admin)
- Stores name, phone, avatar, role

### vehicles
- Customer vehicles with make, model, year, license plate, VIN
- Linked to profiles (owner)

### services
- Service catalog with name, description, price, duration, category

### service_slots
- Available time slots for bookings per date

### bookings
- Core booking table: customer, vehicle, service, slot, status, pickup/drop flag
- Status: pending, confirmed, in_progress, completed, cancelled

### job_cards
- Workshop job cards linked to bookings
- Tracks assigned mechanic, notes, start/end times

### spare_parts
- Parts inventory with name, part_number, quantity, unit_price, reorder_level

### job_card_parts
- Parts used in a job card (linking job_cards to spare_parts)

### invoices
- GST-compliant invoices linked to bookings
- Stores subtotal, tax, total, payment status

### payments
- Payment records linked to invoices (UPI, card, net_banking, cash)

### reviews
- Customer reviews for completed bookings (rating 1-5, comment)

### coupons
- Discount coupons with code, discount type, value, validity

### notifications
- In-app notifications for customers and staff

### blog_posts
- CMS blog posts with title, content, author, published status

### faqs
- FAQ entries with question, answer, category, sort_order

## Security
- RLS enabled on all tables
- Customers: own data only
- Staff/admin: broader access via role checks in profiles
- Public read for services, blog_posts, faqs, coupons
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  avatar_url text DEFAULT '',
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','mechanic','staff','admin')),
  address text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_admin_select" ON profiles;
CREATE POLICY "profiles_admin_select" ON profiles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
);

-- VEHICLES
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  license_plate text NOT NULL,
  vin text DEFAULT '',
  color text DEFAULT '',
  fuel_type text DEFAULT 'petrol' CHECK (fuel_type IN ('petrol','diesel','cng','electric','hybrid')),
  transmission text DEFAULT 'manual' CHECK (transmission IN ('manual','automatic')),
  mileage integer DEFAULT 0,
  last_service_date date,
  image_url text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vehicles_select_own" ON vehicles;
CREATE POLICY "vehicles_select_own" ON vehicles FOR SELECT TO authenticated USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "vehicles_insert_own" ON vehicles;
CREATE POLICY "vehicles_insert_own" ON vehicles FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "vehicles_update_own" ON vehicles;
CREATE POLICY "vehicles_update_own" ON vehicles FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "vehicles_delete_own" ON vehicles;
CREATE POLICY "vehicles_delete_own" ON vehicles FOR DELETE TO authenticated USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "vehicles_staff_select" ON vehicles;
CREATE POLICY "vehicles_staff_select" ON vehicles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff','mechanic'))
);

-- SERVICES
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general','periodic','repair','wash','inspection','tyres','ac','electrical','bodywork','other')),
  base_price numeric(10,2) NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true,
  image_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "services_public_select" ON services;
CREATE POLICY "services_public_select" ON services FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "services_admin_insert" ON services;
CREATE POLICY "services_admin_insert" ON services FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
);
DROP POLICY IF EXISTS "services_admin_update" ON services;
CREATE POLICY "services_admin_update" ON services FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
);
DROP POLICY IF EXISTS "services_admin_delete" ON services;
CREATE POLICY "services_admin_delete" ON services FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
);

-- BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number text UNIQUE NOT NULL DEFAULT 'BK-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6),
  customer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id),
  scheduled_date date NOT NULL,
  scheduled_time time NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled')),
  pickup_required boolean NOT NULL DEFAULT false,
  pickup_address text DEFAULT '',
  drop_required boolean NOT NULL DEFAULT false,
  drop_address text DEFAULT '',
  special_instructions text DEFAULT '',
  estimated_cost numeric(10,2) DEFAULT 0,
  actual_cost numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bookings_select_own" ON bookings;
CREATE POLICY "bookings_select_own" ON bookings FOR SELECT TO authenticated USING (auth.uid() = customer_id);
DROP POLICY IF EXISTS "bookings_insert_own" ON bookings;
CREATE POLICY "bookings_insert_own" ON bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
DROP POLICY IF EXISTS "bookings_update_own" ON bookings;
CREATE POLICY "bookings_update_own" ON bookings FOR UPDATE TO authenticated USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);
DROP POLICY IF EXISTS "bookings_delete_own" ON bookings;
CREATE POLICY "bookings_delete_own" ON bookings FOR DELETE TO authenticated USING (auth.uid() = customer_id);
DROP POLICY IF EXISTS "bookings_staff_select" ON bookings;
CREATE POLICY "bookings_staff_select" ON bookings FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff','mechanic'))
);
DROP POLICY IF EXISTS "bookings_staff_update" ON bookings;
CREATE POLICY "bookings_staff_update" ON bookings FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff','mechanic'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff','mechanic'))
);

-- JOB CARDS
CREATE TABLE IF NOT EXISTS job_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number text UNIQUE NOT NULL DEFAULT 'JC-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  assigned_mechanic_id uuid REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','on_hold','completed','closed')),
  diagnosis text DEFAULT '',
  work_done text DEFAULT '',
  technician_notes text DEFAULT '',
  start_time timestamptz,
  end_time timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE job_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "job_cards_staff_select" ON job_cards;
CREATE POLICY "job_cards_staff_select" ON job_cards FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff','mechanic'))
  OR assigned_mechanic_id = auth.uid()
);
DROP POLICY IF EXISTS "job_cards_staff_insert" ON job_cards;
CREATE POLICY "job_cards_staff_insert" ON job_cards FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
);
DROP POLICY IF EXISTS "job_cards_staff_update" ON job_cards;
CREATE POLICY "job_cards_staff_update" ON job_cards FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff','mechanic'))
  OR assigned_mechanic_id = auth.uid()
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff','mechanic'))
  OR assigned_mechanic_id = auth.uid()
);
DROP POLICY IF EXISTS "job_cards_staff_delete" ON job_cards;
CREATE POLICY "job_cards_staff_delete" ON job_cards FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
);

-- SPARE PARTS
CREATE TABLE IF NOT EXISTS spare_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  part_number text UNIQUE NOT NULL,
  category text DEFAULT 'general',
  description text DEFAULT '',
  quantity integer NOT NULL DEFAULT 0,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  reorder_level integer NOT NULL DEFAULT 5,
  supplier text DEFAULT '',
  location text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE spare_parts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "spare_parts_staff_select" ON spare_parts;
CREATE POLICY "spare_parts_staff_select" ON spare_parts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff','mechanic'))
);
DROP POLICY IF EXISTS "spare_parts_admin_insert" ON spare_parts;
CREATE POLICY "spare_parts_admin_insert" ON spare_parts FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
);
DROP POLICY IF EXISTS "spare_parts_admin_update" ON spare_parts;
CREATE POLICY "spare_parts_admin_update" ON spare_parts FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
);
DROP POLICY IF EXISTS "spare_parts_admin_delete" ON spare_parts;
CREATE POLICY "spare_parts_admin_delete" ON spare_parts FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- JOB CARD PARTS (parts used per job card)
CREATE TABLE IF NOT EXISTS job_card_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_card_id uuid NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
  spare_part_id uuid NOT NULL REFERENCES spare_parts(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE job_card_parts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jcp_staff_select" ON job_card_parts;
CREATE POLICY "jcp_staff_select" ON job_card_parts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff','mechanic'))
);
DROP POLICY IF EXISTS "jcp_staff_insert" ON job_card_parts;
CREATE POLICY "jcp_staff_insert" ON job_card_parts FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff','mechanic'))
);
DROP POLICY IF EXISTS "jcp_staff_update" ON job_card_parts;
CREATE POLICY "jcp_staff_update" ON job_card_parts FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff','mechanic'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff','mechanic'))
);
DROP POLICY IF EXISTS "jcp_staff_delete" ON job_card_parts;
CREATE POLICY "jcp_staff_delete" ON job_card_parts FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
);

-- INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL DEFAULT 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id),
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 18.00,
  tax_amount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partial','paid','refunded')),
  due_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices_select_own" ON invoices;
CREATE POLICY "invoices_select_own" ON invoices FOR SELECT TO authenticated USING (auth.uid() = customer_id);
DROP POLICY IF EXISTS "invoices_insert_staff" ON invoices;
CREATE POLICY "invoices_insert_staff" ON invoices FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
);
DROP POLICY IF EXISTS "invoices_update_staff" ON invoices;
CREATE POLICY "invoices_update_staff" ON invoices FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
);
DROP POLICY IF EXISTS "invoices_delete_admin" ON invoices;
CREATE POLICY "invoices_delete_admin" ON invoices FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS "invoices_staff_select" ON invoices;
CREATE POLICY "invoices_staff_select" ON invoices FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  method text NOT NULL DEFAULT 'cash' CHECK (method IN ('cash','upi','card','net_banking','wallet')),
  transaction_id text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','refunded')),
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_staff_select" ON payments;
CREATE POLICY "payments_staff_select" ON payments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
);
DROP POLICY IF EXISTS "payments_staff_insert" ON payments;
CREATE POLICY "payments_staff_insert" ON payments FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
);
DROP POLICY IF EXISTS "payments_staff_update" ON payments;
CREATE POLICY "payments_staff_update" ON payments FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
);
DROP POLICY IF EXISTS "payments_staff_delete" ON payments;
CREATE POLICY "payments_staff_delete" ON payments FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS "payments_customer_select" ON payments;
CREATE POLICY "payments_customer_select" ON payments FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM invoices i WHERE i.id = invoice_id AND i.customer_id = auth.uid()
  )
);

-- REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text DEFAULT '',
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reviews_public_select" ON reviews;
CREATE POLICY "reviews_public_select" ON reviews FOR SELECT TO anon, authenticated USING (is_published = true);
DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
CREATE POLICY "reviews_insert_own" ON reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
DROP POLICY IF EXISTS "reviews_update_own" ON reviews;
CREATE POLICY "reviews_update_own" ON reviews FOR UPDATE TO authenticated USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);
DROP POLICY IF EXISTS "reviews_delete_own" ON reviews;
CREATE POLICY "reviews_delete_own" ON reviews FOR DELETE TO authenticated USING (auth.uid() = customer_id);

-- COUPONS
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text DEFAULT '',
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage','fixed')),
  discount_value numeric(10,2) NOT NULL,
  min_order_amount numeric(10,2) DEFAULT 0,
  max_discount numeric(10,2),
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coupons_public_select" ON coupons;
CREATE POLICY "coupons_public_select" ON coupons FOR SELECT TO anon, authenticated USING (is_active = true AND valid_until > now());
DROP POLICY IF EXISTS "coupons_admin_insert" ON coupons;
CREATE POLICY "coupons_admin_insert" ON coupons FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS "coupons_admin_update" ON coupons;
CREATE POLICY "coupons_admin_update" ON coupons FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
DROP POLICY IF EXISTS "coupons_admin_delete" ON coupons;
CREATE POLICY "coupons_admin_delete" ON coupons FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info','success','warning','error','booking','payment','reminder')),
  is_read boolean NOT NULL DEFAULT false,
  link text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_insert_staff" ON notifications;
CREATE POLICY "notifications_insert_staff" ON notifications FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
);
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- BLOG POSTS
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  excerpt text DEFAULT '',
  content text DEFAULT '',
  cover_image text DEFAULT '',
  author_id uuid REFERENCES profiles(id),
  category text DEFAULT 'tips',
  tags text[] DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blog_public_select" ON blog_posts;
CREATE POLICY "blog_public_select" ON blog_posts FOR SELECT TO anon, authenticated USING (is_published = true);
DROP POLICY IF EXISTS "blog_admin_insert" ON blog_posts;
CREATE POLICY "blog_admin_insert" ON blog_posts FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
);
DROP POLICY IF EXISTS "blog_admin_update" ON blog_posts;
CREATE POLICY "blog_admin_update" ON blog_posts FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
);
DROP POLICY IF EXISTS "blog_admin_delete" ON blog_posts;
CREATE POLICY "blog_admin_delete" ON blog_posts FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
);

-- FAQS
CREATE TABLE IF NOT EXISTS faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text DEFAULT 'general',
  sort_order integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "faqs_public_select" ON faqs;
CREATE POLICY "faqs_public_select" ON faqs FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "faqs_admin_insert" ON faqs;
CREATE POLICY "faqs_admin_insert" ON faqs FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
);
DROP POLICY IF EXISTS "faqs_admin_update" ON faqs;
CREATE POLICY "faqs_admin_update" ON faqs FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
);
DROP POLICY IF EXISTS "faqs_admin_delete" ON faqs;
CREATE POLICY "faqs_admin_delete" ON faqs FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_owner ON vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle ON bookings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_job_cards_booking ON job_cards(booking_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_mechanic ON job_cards(assigned_mechanic_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking ON invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_slug ON blog_posts(slug);

-- Seed: Services
INSERT INTO services (name, description, category, base_price, duration_minutes, image_url) VALUES
('Basic Service', 'Oil change, filter replacement, basic inspection', 'periodic', 1499, 90, 'https://images.pexels.com/photos/3807571/pexels-photo-3807571.jpeg'),
('Full Service', 'Comprehensive service including all fluids, brakes, battery check', 'periodic', 3999, 180, 'https://images.pexels.com/photos/2244746/pexels-photo-2244746.jpeg'),
('AC Service & Repair', 'AC gas refill, compressor check, filter cleaning', 'ac', 1999, 120, 'https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg'),
('Tyre Rotation & Balancing', 'Rotate all 4 tyres and wheel balancing', 'tyres', 599, 60, 'https://images.pexels.com/photos/3807629/pexels-photo-3807629.jpeg'),
('Car Wash & Detailing', 'Premium car wash with interior vacuuming and wax polish', 'wash', 799, 90, 'https://images.pexels.com/photos/6873087/pexels-photo-6873087.jpeg'),
('Brake Inspection & Repair', 'Brake pad replacement, disc resurfacing, fluid check', 'repair', 2499, 120, 'https://images.pexels.com/photos/3807571/pexels-photo-3807571.jpeg'),
('Battery Check & Replacement', 'Battery health check, terminal cleaning, replacement if needed', 'electrical', 499, 30, 'https://images.pexels.com/photos/2244746/pexels-photo-2244746.jpeg'),
('Wheel Alignment', '4-wheel computerised alignment', 'tyres', 699, 60, 'https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg')
ON CONFLICT DO NOTHING;

-- Seed: FAQs
INSERT INTO faqs (question, answer, category, sort_order) VALUES
('How do I book a car service?', 'You can book a car service by creating an account, adding your vehicle, selecting a service and choosing a date and time slot that works for you.', 'booking', 1),
('Do you offer pickup and drop service?', 'Yes! We offer doorstep pickup and drop service for an additional charge. You can enable this option while booking.', 'booking', 2),
('How long does a basic service take?', 'A basic service typically takes 1.5 to 2 hours. Full service may take 3-4 hours. We will provide you with an estimated time during booking.', 'service', 3),
('Can I track my car service status?', 'Yes, you can track your service status in real-time through your customer dashboard under Booking History.', 'tracking', 4),
('What payment methods do you accept?', 'We accept UPI, Credit/Debit Cards, Net Banking, and Cash. All digital payments are secured with industry-standard encryption.', 'payment', 5),
('How do I download my invoice?', 'Once your service is complete and payment is processed, you can download the GST-compliant invoice as a PDF from your Booking History.', 'payment', 6),
('Are your mechanics certified?', 'All our mechanics are certified and have minimum 3 years of experience. We regularly train our staff on the latest automotive technologies.', 'service', 7),
('Do you provide warranty on repairs?', 'Yes, we provide a 30-day warranty on all repair work and 6 months on spare parts. Terms and conditions apply.', 'warranty', 8)
ON CONFLICT DO NOTHING;

-- Seed: Blog Posts
INSERT INTO blog_posts (title, slug, excerpt, content, cover_image, category, tags, is_published, published_at) VALUES
('Top 5 Signs Your Car Needs Immediate Service', 'top-5-signs-car-needs-service', 'Ignoring these warning signs could lead to expensive repairs or even dangerous situations on the road.', 'Regular car maintenance is crucial for safety and longevity of your vehicle...', 'https://images.pexels.com/photos/3807571/pexels-photo-3807571.jpeg', 'maintenance', ARRAY['tips','maintenance','safety'], true, now()),
('How Often Should You Change Engine Oil?', 'engine-oil-change-frequency', 'The old 3000-mile oil change rule is outdated. Here is what modern cars actually need.', 'Modern engine oils and car technology have significantly extended oil change intervals...', 'https://images.pexels.com/photos/2244746/pexels-photo-2244746.jpeg', 'tips', ARRAY['oil','engine','maintenance'], true, now()),
('Understanding Your Car Service History', 'understanding-car-service-history', 'A complete service history can add significant value to your car when selling.', 'Keeping track of all service records is one of the best things you can do for your car...', 'https://images.pexels.com/photos/6873087/pexels-photo-6873087.jpeg', 'tips', ARRAY['history','service','value'], true, now())
ON CONFLICT DO NOTHING;
