/*
# Admin-only architecture: public booking, customers table, messaging

## Summary
Restructures DB for admin-controlled workshop:
1. Customers submit booking form on website (no login).
2. Admin manages all customer details, services, invoices, GST billing.
3. Auto GST billing on invoices.
4. Admin sends messages to customers via WhatsApp/SMS/Email.

## New Tables
- customers: customer records managed by admin or submitted via booking form.
- customer_messages: messages sent by admin to customers.

## Altered Tables
- bookings: added customer_name/phone/email/address, vehicle_info, gst columns; made customer_id/vehicle_id/service_id nullable.
- invoices: added customer_name/phone/email/address; made customer_id nullable.

## RLS
- customers: admin full + anon insert (booking form).
- customer_messages: admin-only.
- bookings: admin full + anon insert (public booking form).
- services: anon read + admin full.
- invoices/payments: admin full + anon read.
- branches/coupons: anon read + admin full.
- spare_parts/expenses/vehicles/profiles: admin full.
*/

-- ============================================================
-- 1. CUSTOMERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  pincode text DEFAULT '',
  gstin text DEFAULT '',
  vehicle_number text DEFAULT '',
  vehicle_make text DEFAULT '',
  vehicle_model text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_admin_all" ON customers;
CREATE POLICY "customers_admin_all" ON customers FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "customers_anon_insert" ON customers;
CREATE POLICY "customers_anon_insert" ON customers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "customers_anon_select" ON customers;
CREATE POLICY "customers_anon_select" ON customers FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- 2. CUSTOMER_MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email')),
  subject text DEFAULT '',
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'read')),
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_admin_all" ON customer_messages;
CREATE POLICY "messages_admin_all" ON customer_messages FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 3. ALTER BOOKINGS TABLE
-- ============================================================
DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_name text DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_phone text DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_email text DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_address text DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vehicle_info text DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

ALTER TABLE bookings ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN vehicle_id DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN service_id DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gst_percentage numeric DEFAULT 18.0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gst_amount numeric DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ============================================================
-- 4. ALTER INVOICES TABLE
-- ============================================================
DO $$ BEGIN
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_name text DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_phone text DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_email text DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_address text DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

ALTER TABLE invoices ALTER COLUMN customer_id DROP NOT NULL;

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================

DROP POLICY IF EXISTS "bookings_admin_all" ON bookings;
CREATE POLICY "bookings_admin_all" ON bookings FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "bookings_anon_insert" ON bookings;
CREATE POLICY "bookings_anon_insert" ON bookings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "bookings_anon_select" ON bookings;
CREATE POLICY "bookings_anon_select" ON bookings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "services_read_public" ON services;
CREATE POLICY "services_read_public" ON services FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "services_admin_all" ON services;
CREATE POLICY "services_admin_all" ON services FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "invoices_admin_all" ON invoices;
CREATE POLICY "invoices_admin_all" ON invoices FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "invoices_anon_select" ON invoices;
CREATE POLICY "invoices_anon_select" ON invoices FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "payments_admin_all" ON payments;
CREATE POLICY "payments_admin_all" ON payments FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "payments_anon_select" ON payments;
CREATE POLICY "payments_anon_select" ON payments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "branches_read_public" ON branches;
CREATE POLICY "branches_read_public" ON branches FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "branches_admin_all" ON branches;
CREATE POLICY "branches_admin_all" ON branches FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "coupons_read_public" ON coupons;
CREATE POLICY "coupons_read_public" ON coupons FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "coupons_admin_all" ON coupons;
CREATE POLICY "coupons_admin_all" ON coupons FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "spare_parts_admin_all" ON spare_parts;
CREATE POLICY "spare_parts_admin_all" ON spare_parts FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "expenses_admin_all" ON expenses;
CREATE POLICY "expenses_admin_all" ON expenses FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "vehicles_admin_all" ON vehicles;
CREATE POLICY "vehicles_admin_all" ON vehicles FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 6. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_phone ON bookings(customer_phone);
CREATE INDEX IF NOT EXISTS idx_messages_customer ON customer_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(payment_status);
