
/*
# Premium Features Schema Extension

## Overview
Adds 20+ new tables to support premium car service platform features.

## New Tables
1. `service_reminders` - Oil change, insurance, PUC, tyre rotation reminders per vehicle
2. `fuel_expenses` - Customer fuel log tracker
3. `warranties` - Vehicle part warranties
4. `membership_plans` - Subscription plan definitions
5. `user_memberships` - Customer active memberships
6. `loyalty_transactions` - Points earn/burn ledger
7. `referrals` - Refer & earn tracking
8. `attendance` - Mechanic daily attendance
9. `suppliers` - Parts supplier directory
10. `purchase_orders` + `purchase_order_items` - PO management
11. `vehicle_inspections` + `inspection_items` - Checklist per booking
12. `service_packages` - Bundled service offerings / AMC
13. `user_packages` - Customer purchased packages
14. `support_tickets` + `ticket_messages` - CRM help desk
15. `expenses` - Garage expense tracking
16. `branches` - Multi-branch garage management
17. `chat_messages` - Customer-garage chat
18. `service_photos` - Before/after service photos
19. `audit_logs` - System audit trail
20. `campaigns` - Email/WhatsApp marketing campaigns

## Security
RLS enabled on all tables with role-appropriate policies
*/

-- BRANCHES (Multi-Branch Management)
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL DEFAULT 'New Delhi',
  state text NOT NULL DEFAULT 'Delhi',
  pincode text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  manager_id uuid REFERENCES profiles(id),
  is_active boolean NOT NULL DEFAULT true,
  gstin text DEFAULT '',
  open_time time DEFAULT '08:00',
  close_time time DEFAULT '20:00',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branches_public_select" ON branches;
CREATE POLICY "branches_public_select" ON branches FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "branches_admin_insert" ON branches;
CREATE POLICY "branches_admin_insert" ON branches FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "branches_admin_update" ON branches;
CREATE POLICY "branches_admin_update" ON branches FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "branches_admin_delete" ON branches;
CREATE POLICY "branches_admin_delete" ON branches FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- SERVICE REMINDERS
CREATE TABLE IF NOT EXISTS service_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('oil_change','insurance','puc','tyre_rotation','general_service','battery','brake','custom')),
  title text NOT NULL,
  due_date date NOT NULL,
  due_mileage integer,
  notes text DEFAULT '',
  is_completed boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  notified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE service_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reminders_select_own" ON service_reminders;
CREATE POLICY "reminders_select_own" ON service_reminders FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "reminders_insert_own" ON service_reminders;
CREATE POLICY "reminders_insert_own" ON service_reminders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reminders_update_own" ON service_reminders;
CREATE POLICY "reminders_update_own" ON service_reminders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reminders_delete_own" ON service_reminders;
CREATE POLICY "reminders_delete_own" ON service_reminders FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- FUEL EXPENSES
CREATE TABLE IF NOT EXISTS fuel_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  fuel_type text NOT NULL DEFAULT 'petrol',
  quantity_liters numeric(8,2) NOT NULL,
  price_per_liter numeric(8,2) NOT NULL,
  total_amount numeric(10,2) GENERATED ALWAYS AS (quantity_liters * price_per_liter) STORED,
  odometer integer,
  fuel_station text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE fuel_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fuel_select_own" ON fuel_expenses;
CREATE POLICY "fuel_select_own" ON fuel_expenses FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "fuel_insert_own" ON fuel_expenses;
CREATE POLICY "fuel_insert_own" ON fuel_expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "fuel_update_own" ON fuel_expenses;
CREATE POLICY "fuel_update_own" ON fuel_expenses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "fuel_delete_own" ON fuel_expenses;
CREATE POLICY "fuel_delete_own" ON fuel_expenses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- WARRANTIES
CREATE TABLE IF NOT EXISTS warranties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  part_name text NOT NULL,
  provider text NOT NULL,
  warranty_number text DEFAULT '',
  purchase_date date NOT NULL,
  expiry_date date NOT NULL,
  coverage_description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "warranties_select_own" ON warranties;
CREATE POLICY "warranties_select_own" ON warranties FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "warranties_insert_own" ON warranties;
CREATE POLICY "warranties_insert_own" ON warranties FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "warranties_update_own" ON warranties;
CREATE POLICY "warranties_update_own" ON warranties FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "warranties_delete_own" ON warranties;
CREATE POLICY "warranties_delete_own" ON warranties FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- MEMBERSHIP PLANS
CREATE TABLE IF NOT EXISTS membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  price_monthly numeric(10,2) NOT NULL,
  price_yearly numeric(10,2) NOT NULL,
  features text[] NOT NULL DEFAULT '{}',
  free_services integer NOT NULL DEFAULT 0,
  discount_percentage numeric(5,2) NOT NULL DEFAULT 0,
  priority_booking boolean NOT NULL DEFAULT false,
  free_pickup_drop boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  color text NOT NULL DEFAULT '#3b82f6',
  badge text DEFAULT 'Standard',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plans_public_select" ON membership_plans;
CREATE POLICY "plans_public_select" ON membership_plans FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "plans_admin_insert" ON membership_plans;
CREATE POLICY "plans_admin_insert" ON membership_plans FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "plans_admin_update" ON membership_plans;
CREATE POLICY "plans_admin_update" ON membership_plans FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "plans_admin_delete" ON membership_plans;
CREATE POLICY "plans_admin_delete" ON membership_plans FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- USER MEMBERSHIPS
CREATE TABLE IF NOT EXISTS user_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES membership_plans(id),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled','pending')),
  amount_paid numeric(10,2) NOT NULL DEFAULT 0,
  services_used integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "memberships_select_own" ON user_memberships;
CREATE POLICY "memberships_select_own" ON user_memberships FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "memberships_insert_own" ON user_memberships;
CREATE POLICY "memberships_insert_own" ON user_memberships FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "memberships_update_own" ON user_memberships;
CREATE POLICY "memberships_update_own" ON user_memberships FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "memberships_delete_own" ON user_memberships;
CREATE POLICY "memberships_delete_own" ON user_memberships FOR DELETE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "memberships_admin_select" ON user_memberships;
CREATE POLICY "memberships_admin_select" ON user_memberships FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));

-- LOYALTY TRANSACTIONS
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id),
  type text NOT NULL CHECK (type IN ('earn','redeem','bonus','referral','expiry')),
  points integer NOT NULL,
  description text NOT NULL,
  balance_after integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "loyalty_select_own" ON loyalty_transactions;
CREATE POLICY "loyalty_select_own" ON loyalty_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "loyalty_insert_staff" ON loyalty_transactions;
CREATE POLICY "loyalty_insert_staff" ON loyalty_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "loyalty_admin_select" ON loyalty_transactions;
CREATE POLICY "loyalty_admin_select" ON loyalty_transactions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "loyalty_update_own" ON loyalty_transactions;
CREATE POLICY "loyalty_update_own" ON loyalty_transactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "loyalty_delete_admin" ON loyalty_transactions;
CREATE POLICY "loyalty_delete_admin" ON loyalty_transactions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- REFERRALS
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES profiles(id),
  referred_id uuid REFERENCES profiles(id),
  referral_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','expired')),
  referrer_points integer NOT NULL DEFAULT 200,
  referred_points integer NOT NULL DEFAULT 100,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referrals_select_own" ON referrals;
CREATE POLICY "referrals_select_own" ON referrals FOR SELECT TO authenticated USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
DROP POLICY IF EXISTS "referrals_insert_own" ON referrals;
CREATE POLICY "referrals_insert_own" ON referrals FOR INSERT TO authenticated WITH CHECK (auth.uid() = referrer_id);
DROP POLICY IF EXISTS "referrals_update_own" ON referrals;
CREATE POLICY "referrals_update_own" ON referrals FOR UPDATE TO authenticated USING (auth.uid() = referrer_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))) WITH CHECK (auth.uid() = referrer_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "referrals_delete_admin" ON referrals;
CREATE POLICY "referrals_delete_admin" ON referrals FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ATTENDANCE
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  check_in timestamptz,
  check_out timestamptz,
  status text NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','half_day','leave')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE (mechanic_id, date)
);
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendance_select_staff" ON attendance;
CREATE POLICY "attendance_select_staff" ON attendance FOR SELECT TO authenticated USING (auth.uid() = mechanic_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "attendance_insert_staff" ON attendance;
CREATE POLICY "attendance_insert_staff" ON attendance FOR INSERT TO authenticated WITH CHECK (auth.uid() = mechanic_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "attendance_update_staff" ON attendance;
CREATE POLICY "attendance_update_staff" ON attendance FOR UPDATE TO authenticated USING (auth.uid() = mechanic_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))) WITH CHECK (auth.uid() = mechanic_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "attendance_delete_admin" ON attendance;
CREATE POLICY "attendance_delete_admin" ON attendance FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));

-- SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  address text DEFAULT '',
  gstin text DEFAULT '',
  payment_terms text DEFAULT 'net30',
  rating integer DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  is_active boolean NOT NULL DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "suppliers_staff_select" ON suppliers;
CREATE POLICY "suppliers_staff_select" ON suppliers FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff','mechanic')));
DROP POLICY IF EXISTS "suppliers_admin_insert" ON suppliers;
CREATE POLICY "suppliers_admin_insert" ON suppliers FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "suppliers_admin_update" ON suppliers;
CREATE POLICY "suppliers_admin_update" ON suppliers FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "suppliers_admin_delete" ON suppliers;
CREATE POLICY "suppliers_admin_delete" ON suppliers FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- PURCHASE ORDERS
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE NOT NULL DEFAULT 'PO-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','confirmed','received','cancelled')),
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_date date,
  received_date date,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  tax_amount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partial','paid')),
  notes text DEFAULT '',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "po_staff_select" ON purchase_orders;
CREATE POLICY "po_staff_select" ON purchase_orders FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "po_staff_insert" ON purchase_orders;
CREATE POLICY "po_staff_insert" ON purchase_orders FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "po_staff_update" ON purchase_orders;
CREATE POLICY "po_staff_update" ON purchase_orders FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "po_admin_delete" ON purchase_orders;
CREATE POLICY "po_admin_delete" ON purchase_orders FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- PURCHASE ORDER ITEMS
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  spare_part_id uuid REFERENCES spare_parts(id),
  part_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  received_qty integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "poi_staff_select" ON purchase_order_items;
CREATE POLICY "poi_staff_select" ON purchase_order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "poi_staff_insert" ON purchase_order_items;
CREATE POLICY "poi_staff_insert" ON purchase_order_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "poi_staff_update" ON purchase_order_items;
CREATE POLICY "poi_staff_update" ON purchase_order_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "poi_admin_delete" ON purchase_order_items;
CREATE POLICY "poi_admin_delete" ON purchase_order_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));

-- VEHICLE INSPECTIONS
CREATE TABLE IF NOT EXISTS vehicle_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  inspector_id uuid REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
  overall_condition text CHECK (overall_condition IN ('excellent','good','fair','poor')),
  notes text DEFAULT '',
  mileage_at_inspection integer,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inspections_staff_select" ON vehicle_inspections;
CREATE POLICY "inspections_staff_select" ON vehicle_inspections FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff','mechanic')));
DROP POLICY IF EXISTS "inspections_customer_select" ON vehicle_inspections;
CREATE POLICY "inspections_customer_select" ON vehicle_inspections FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid()));
DROP POLICY IF EXISTS "inspections_staff_insert" ON vehicle_inspections;
CREATE POLICY "inspections_staff_insert" ON vehicle_inspections FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff','mechanic')));
DROP POLICY IF EXISTS "inspections_staff_update" ON vehicle_inspections;
CREATE POLICY "inspections_staff_update" ON vehicle_inspections FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff','mechanic'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff','mechanic')));
DROP POLICY IF EXISTS "inspections_admin_delete" ON vehicle_inspections;
CREATE POLICY "inspections_admin_delete" ON vehicle_inspections FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));

-- INSPECTION ITEMS
CREATE TABLE IF NOT EXISTS inspection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES vehicle_inspections(id) ON DELETE CASCADE,
  category text NOT NULL,
  item_name text NOT NULL,
  condition text CHECK (condition IN ('ok','needs_attention','critical','na')),
  notes text DEFAULT '',
  photo_url text DEFAULT ''
);
ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insp_items_staff_all" ON inspection_items;
CREATE POLICY "insp_items_staff_all" ON inspection_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff','mechanic')));

-- SERVICE PACKAGES (including AMC)
CREATE TABLE IF NOT EXISTS service_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  type text NOT NULL DEFAULT 'package' CHECK (type IN ('package','amc','subscription')),
  price numeric(10,2) NOT NULL,
  validity_days integer NOT NULL DEFAULT 365,
  services_included text[] NOT NULL DEFAULT '{}',
  max_services integer DEFAULT NULL,
  free_pickup_drop boolean NOT NULL DEFAULT false,
  discount_on_parts numeric(5,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  image_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pkgs_public_select" ON service_packages;
CREATE POLICY "pkgs_public_select" ON service_packages FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "pkgs_admin_insert" ON service_packages;
CREATE POLICY "pkgs_admin_insert" ON service_packages FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "pkgs_admin_update" ON service_packages;
CREATE POLICY "pkgs_admin_update" ON service_packages FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "pkgs_admin_delete" ON service_packages;
CREATE POLICY "pkgs_admin_delete" ON service_packages FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- USER PACKAGES
CREATE TABLE IF NOT EXISTS user_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  package_id uuid NOT NULL REFERENCES service_packages(id),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  services_used integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  amount_paid numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE user_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "upkgs_select_own" ON user_packages;
CREATE POLICY "upkgs_select_own" ON user_packages FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "upkgs_insert_own" ON user_packages;
CREATE POLICY "upkgs_insert_own" ON user_packages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "upkgs_update_own" ON user_packages;
CREATE POLICY "upkgs_update_own" ON user_packages FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "upkgs_delete_own" ON user_packages;
CREATE POLICY "upkgs_delete_own" ON user_packages FOR DELETE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "upkgs_admin_select" ON user_packages;
CREATE POLICY "upkgs_admin_select" ON user_packages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));

-- SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL DEFAULT 'TKT-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6),
  customer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  booking_id uuid REFERENCES bookings(id),
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general','billing','booking','service','complaint','feedback','other')),
  subject text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  assigned_to uuid REFERENCES profiles(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tickets_select_own" ON support_tickets;
CREATE POLICY "tickets_select_own" ON support_tickets FOR SELECT TO authenticated USING (auth.uid() = customer_id);
DROP POLICY IF EXISTS "tickets_insert_own" ON support_tickets;
CREATE POLICY "tickets_insert_own" ON support_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
DROP POLICY IF EXISTS "tickets_update_own" ON support_tickets;
CREATE POLICY "tickets_update_own" ON support_tickets FOR UPDATE TO authenticated USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);
DROP POLICY IF EXISTS "tickets_staff_select" ON support_tickets;
CREATE POLICY "tickets_staff_select" ON support_tickets FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "tickets_staff_update" ON support_tickets;
CREATE POLICY "tickets_staff_update" ON support_tickets FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "tickets_delete_admin" ON support_tickets;
CREATE POLICY "tickets_delete_admin" ON support_tickets FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- TICKET MESSAGES
CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  message text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tmsg_all_authenticated" ON ticket_messages;
CREATE POLICY "tmsg_all_authenticated" ON ticket_messages FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_id AND (t.customer_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))))
);

-- EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches(id),
  category text NOT NULL CHECK (category IN ('salary','parts','utilities','rent','marketing','maintenance','equipment','other')),
  title text NOT NULL,
  amount numeric(10,2) NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  paid_to text DEFAULT '',
  receipt_url text DEFAULT '',
  notes text DEFAULT '',
  recorded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expenses_staff_select" ON expenses;
CREATE POLICY "expenses_staff_select" ON expenses FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "expenses_staff_insert" ON expenses;
CREATE POLICY "expenses_staff_insert" ON expenses FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "expenses_staff_update" ON expenses;
CREATE POLICY "expenses_staff_update" ON expenses FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "expenses_admin_delete" ON expenses;
CREATE POLICY "expenses_admin_delete" ON expenses FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- CHAT MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  receiver_id uuid NOT NULL REFERENCES profiles(id),
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','image','file','system')),
  media_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_select_participant" ON chat_messages;
CREATE POLICY "chat_select_participant" ON chat_messages FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "chat_insert_own" ON chat_messages;
CREATE POLICY "chat_insert_own" ON chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "chat_update_receiver" ON chat_messages;
CREATE POLICY "chat_update_receiver" ON chat_messages FOR UPDATE TO authenticated USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);
DROP POLICY IF EXISTS "chat_delete_own" ON chat_messages;
CREATE POLICY "chat_delete_own" ON chat_messages FOR DELETE TO authenticated USING (auth.uid() = sender_id);

-- SERVICE PHOTOS
CREATE TABLE IF NOT EXISTS service_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  job_card_id uuid REFERENCES job_cards(id),
  photo_url text NOT NULL,
  photo_type text NOT NULL DEFAULT 'before' CHECK (photo_type IN ('before','during','after')),
  caption text DEFAULT '',
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE service_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "photos_select_participant" ON service_photos;
CREATE POLICY "photos_select_participant" ON service_photos FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff','mechanic'))
);
DROP POLICY IF EXISTS "photos_insert_staff" ON service_photos;
CREATE POLICY "photos_insert_staff" ON service_photos FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff','mechanic')));
DROP POLICY IF EXISTS "photos_update_staff" ON service_photos;
CREATE POLICY "photos_update_staff" ON service_photos FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff','mechanic'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff','mechanic')));
DROP POLICY IF EXISTS "photos_delete_staff" ON service_photos;
CREATE POLICY "photos_delete_staff" ON service_photos FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_admin_select" ON audit_logs;
CREATE POLICY "audit_admin_select" ON audit_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "audit_insert_authenticated" ON audit_logs;
CREATE POLICY "audit_insert_authenticated" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "audit_update_admin" ON audit_logs;
CREATE POLICY "audit_update_admin" ON audit_logs FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "audit_delete_admin" ON audit_logs;
CREATE POLICY "audit_delete_admin" ON audit_logs FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- CAMPAIGNS
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL DEFAULT 'email' CHECK (type IN ('email','whatsapp','sms','push')),
  subject text DEFAULT '',
  content text NOT NULL,
  target_audience text NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all','customers','members','inactive')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sent','failed')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  sent_count integer NOT NULL DEFAULT 0,
  open_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaigns_admin_select" ON campaigns;
CREATE POLICY "campaigns_admin_select" ON campaigns FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "campaigns_admin_insert" ON campaigns;
CREATE POLICY "campaigns_admin_insert" ON campaigns FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "campaigns_admin_update" ON campaigns;
CREATE POLICY "campaigns_admin_update" ON campaigns FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));
DROP POLICY IF EXISTS "campaigns_admin_delete" ON campaigns;
CREATE POLICY "campaigns_admin_delete" ON campaigns FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reminders_user ON service_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_vehicle ON service_reminders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON service_reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_fuel_user ON fuel_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_warranties_user ON warranties(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_user ON loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_mechanic ON attendance(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_chat_booking ON chat_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_photos_booking ON service_photos(booking_id);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);

-- Seed: Membership Plans
INSERT INTO membership_plans (name, description, price_monthly, price_yearly, features, free_services, discount_percentage, priority_booking, free_pickup_drop, color, badge) VALUES
('Silver', 'Perfect for occasional car owners', 299, 2999, ARRAY['10% discount on all services','Priority customer support','Booking reminders','Monthly health check'], 1, 10, false, false, '#6b7280', 'Silver'),
('Gold', 'Best value for regular service customers', 599, 5999, ARRAY['20% discount on all services','Priority booking slots','1 free basic service/month','Free pickup & drop','Emergency roadside support'], 2, 20, true, true, '#d97706', 'Gold'),
('Platinum', 'Premium plan for complete peace of mind', 999, 9999, ARRAY['30% discount on all services','Dedicated service advisor','2 free full services/year','Free pickup & drop always','24/7 emergency support','Annual health inspection','Engine protection cover'], 3, 30, true, true, '#7c3aed', 'Platinum')
ON CONFLICT DO NOTHING;

-- Seed: Service Packages / AMC
INSERT INTO service_packages (name, description, type, price, validity_days, services_included, max_services, free_pickup_drop, discount_on_parts) VALUES
('Basic AMC', '1-year annual maintenance contract with 2 basic services', 'amc', 4999, 365, ARRAY['Basic Service x2','Tyre Rotation','Battery Check'], 4, false, 10),
('Premium AMC', '1-year AMC with full services and priority support', 'amc', 9999, 365, ARRAY['Full Service x2','AC Service','Tyre Service','Car Wash x4'], 8, true, 20),
('Monsoon Package', 'Pre-monsoon complete vehicle checkup', 'package', 1999, 90, ARRAY['Tyre Check','Brake Check','Wiper Service','AC Inspection','Battery Test'], 1, false, 0),
('Summer Care Package', 'Beat the heat with complete AC & cooling check', 'package', 2499, 90, ARRAY['AC Full Service','Coolant Top-up','Radiator Check','Battery Check'], 1, false, 5)
ON CONFLICT DO NOTHING;

-- Seed: Branches
INSERT INTO branches (name, address, city, state, pincode, phone) VALUES
('AutoCare Pro - Connaught Place', 'Shop 5, Inner Circle, Connaught Place', 'New Delhi', 'Delhi', '110001', '+91 11 4001 2345'),
('AutoCare Pro - Lajpat Nagar', 'B-12, Ring Road, Lajpat Nagar', 'New Delhi', 'Delhi', '110024', '+91 11 4001 6789'),
('AutoCare Pro - Noida', 'Sector 18, Plot 24, Noida', 'Noida', 'Uttar Pradesh', '201301', '+91 120 4001 234')
ON CONFLICT DO NOTHING;

-- Seed: Suppliers
INSERT INTO suppliers (name, contact_person, phone, email, gstin, payment_terms, rating) VALUES
('Bosch Auto Parts', 'Rajesh Kumar', '+91 98765 11111', 'rajesh@boschparts.in', '07AABCB1234B1Z5', 'net30', 5),
('Minda Industries', 'Priya Singh', '+91 98765 22222', 'priya@minda.in', '07AABCM4567B1Z5', 'net15', 4),
('NGK Spark Plugs India', 'Amit Sharma', '+91 98765 33333', 'amit@ngkindia.com', '07AABCN7890B1Z5', 'net30', 5),
('MRF Tyres', 'Sunita Patel', '+91 98765 44444', 'sunita@mrf.in', '07AABCM0123B1Z5', 'net45', 4)
ON CONFLICT DO NOTHING;
