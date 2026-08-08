
/*
# Billing & Payment System — Extend + Create

## Overview
Extends the existing `invoices` table with full billing columns and creates
four new tables: payment_transactions, payment_methods, refunds, emi_plans.

## Changes to existing tables

### invoices (extend)
- Add `line_items` JSONB — array of {name, qty, unit_price, tax_rate, amount}
- Add `amount_paid` — running total paid so far
- Add `status` (draft/sent/paid/partial/overdue/cancelled) — richer than payment_status
- Add `paid_at`, `updated_at`, `gstin`, `vehicle_info`, `created_by`, `branch_id`

## New Tables

### payment_transactions
Each payment attempt linked to an invoice. Stores method (upi/card/netbanking/
wallet/cash/emi), status, and method-specific fields (upi_id, card_last4, etc.).

### payment_methods
Saved/tokenised payment methods per customer (masked tokens only, no raw data).

### refunds
Refund requests with approval workflow.

### emi_plans
Per-instalment EMI schedule rows linked to a payment_transaction.

## Security
RLS enabled on all tables, owner-scoped plus staff/admin read/write.
*/

-- ─── EXTEND invoices ─────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='line_items') THEN
    ALTER TABLE invoices ADD COLUMN line_items jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='amount_paid') THEN
    ALTER TABLE invoices ADD COLUMN amount_paid numeric(12,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='status') THEN
    ALTER TABLE invoices ADD COLUMN status text NOT NULL DEFAULT 'draft';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='paid_at') THEN
    ALTER TABLE invoices ADD COLUMN paid_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='updated_at') THEN
    ALTER TABLE invoices ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='gstin') THEN
    ALTER TABLE invoices ADD COLUMN gstin text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='vehicle_info') THEN
    ALTER TABLE invoices ADD COLUMN vehicle_info text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='created_by') THEN
    ALTER TABLE invoices ADD COLUMN created_by uuid REFERENCES profiles(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='branch_id') THEN
    ALTER TABLE invoices ADD COLUMN branch_id uuid REFERENCES branches(id);
  END IF;
END $$;

-- Sync status with existing payment_status values
UPDATE invoices SET status = payment_status WHERE status = 'draft' AND payment_status IS NOT NULL;

-- RLS on invoices (ensure enabled + policies)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inv_customer_select" ON invoices;
CREATE POLICY "inv_customer_select" ON invoices FOR SELECT TO authenticated
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "inv_customer_insert" ON invoices;
CREATE POLICY "inv_customer_insert" ON invoices FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "inv_customer_update" ON invoices;
CREATE POLICY "inv_customer_update" ON invoices FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "inv_customer_delete" ON invoices;
CREATE POLICY "inv_customer_delete" ON invoices FOR DELETE TO authenticated
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "inv_staff_select" ON invoices;
CREATE POLICY "inv_staff_select" ON invoices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));

DROP POLICY IF EXISTS "inv_staff_insert" ON invoices;
CREATE POLICY "inv_staff_insert" ON invoices FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));

DROP POLICY IF EXISTS "inv_staff_update" ON invoices;
CREATE POLICY "inv_staff_update" ON invoices FOR UPDATE TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));

DROP POLICY IF EXISTS "inv_admin_delete" ON invoices;
CREATE POLICY "inv_admin_delete" ON invoices FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ─── PAYMENT TRANSACTIONS ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_transactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text UNIQUE NOT NULL
    DEFAULT 'TXN' || to_char(now(),'YYYYMMDDHH24MISS') || upper(substr(gen_random_uuid()::text,1,6)),
  invoice_id     uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  amount         numeric(12,2) NOT NULL,
  method         text NOT NULL CHECK (method IN ('upi','card','netbanking','wallet','cash','emi')),
  status         text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','success','failed','refunded')),
  upi_id         text DEFAULT '',
  card_last4     text DEFAULT '',
  card_brand     text DEFAULT '',
  bank_name      text DEFAULT '',
  wallet_name    text DEFAULT '',
  emi_months     integer DEFAULT NULL,
  gateway_ref    text DEFAULT '',
  failure_reason text DEFAULT '',
  notes          text DEFAULT '',
  initiated_at   timestamptz DEFAULT now(),
  processed_at   timestamptz,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "txn_customer_select" ON payment_transactions;
CREATE POLICY "txn_customer_select" ON payment_transactions FOR SELECT TO authenticated
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "txn_customer_insert" ON payment_transactions;
CREATE POLICY "txn_customer_insert" ON payment_transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "txn_customer_update" ON payment_transactions;
CREATE POLICY "txn_customer_update" ON payment_transactions FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "txn_customer_delete" ON payment_transactions;
CREATE POLICY "txn_customer_delete" ON payment_transactions FOR DELETE TO authenticated
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "txn_staff_select" ON payment_transactions;
CREATE POLICY "txn_staff_select" ON payment_transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));

DROP POLICY IF EXISTS "txn_staff_insert" ON payment_transactions;
CREATE POLICY "txn_staff_insert" ON payment_transactions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));

DROP POLICY IF EXISTS "txn_staff_update" ON payment_transactions;
CREATE POLICY "txn_staff_update" ON payment_transactions FOR UPDATE TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));

DROP POLICY IF EXISTS "txn_admin_delete" ON payment_transactions;
CREATE POLICY "txn_admin_delete" ON payment_transactions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ─── SAVED PAYMENT METHODS ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_methods (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  method_type  text NOT NULL CHECK (method_type IN ('upi','card','netbanking','wallet')),
  display_name text NOT NULL,
  token        text NOT NULL DEFAULT '',
  is_default   boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pm_select_own" ON payment_methods;
CREATE POLICY "pm_select_own" ON payment_methods FOR SELECT TO authenticated
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "pm_insert_own" ON payment_methods;
CREATE POLICY "pm_insert_own" ON payment_methods FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "pm_update_own" ON payment_methods;
CREATE POLICY "pm_update_own" ON payment_methods FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "pm_delete_own" ON payment_methods;
CREATE POLICY "pm_delete_own" ON payment_methods FOR DELETE TO authenticated
  USING (auth.uid() = customer_id);

-- ─── REFUNDS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refunds (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_number  text UNIQUE NOT NULL
    DEFAULT 'REF-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text,1,6)),
  transaction_id uuid NOT NULL REFERENCES payment_transactions(id),
  invoice_id     uuid NOT NULL REFERENCES invoices(id),
  customer_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  amount         numeric(12,2) NOT NULL,
  reason         text NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','processed','rejected')),
  processed_by   uuid REFERENCES profiles(id),
  processed_at   timestamptz,
  notes          text DEFAULT '',
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "refund_customer_select" ON refunds;
CREATE POLICY "refund_customer_select" ON refunds FOR SELECT TO authenticated
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "refund_customer_insert" ON refunds;
CREATE POLICY "refund_customer_insert" ON refunds FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "refund_customer_update" ON refunds;
CREATE POLICY "refund_customer_update" ON refunds FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "refund_customer_delete" ON refunds;
CREATE POLICY "refund_customer_delete" ON refunds FOR DELETE TO authenticated
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "refund_staff_select" ON refunds;
CREATE POLICY "refund_staff_select" ON refunds FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));

DROP POLICY IF EXISTS "refund_staff_insert" ON refunds;
CREATE POLICY "refund_staff_insert" ON refunds FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));

DROP POLICY IF EXISTS "refund_staff_update" ON refunds;
CREATE POLICY "refund_staff_update" ON refunds FOR UPDATE TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));

DROP POLICY IF EXISTS "refund_admin_delete" ON refunds;
CREATE POLICY "refund_admin_delete" ON refunds FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ─── EMI PLANS ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS emi_plans (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id    uuid NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
  customer_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  instalment_number integer NOT NULL,
  due_date          date NOT NULL,
  amount            numeric(12,2) NOT NULL,
  status            text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','overdue')),
  paid_at           timestamptz,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE emi_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "emi_customer_select" ON emi_plans;
CREATE POLICY "emi_customer_select" ON emi_plans FOR SELECT TO authenticated
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "emi_customer_insert" ON emi_plans;
CREATE POLICY "emi_customer_insert" ON emi_plans FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "emi_customer_update" ON emi_plans;
CREATE POLICY "emi_customer_update" ON emi_plans FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "emi_customer_delete" ON emi_plans;
CREATE POLICY "emi_customer_delete" ON emi_plans FOR DELETE TO authenticated
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "emi_staff_select" ON emi_plans;
CREATE POLICY "emi_staff_select" ON emi_plans FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));

DROP POLICY IF EXISTS "emi_staff_insert" ON emi_plans;
CREATE POLICY "emi_staff_insert" ON emi_plans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));

DROP POLICY IF EXISTS "emi_staff_update" ON emi_plans;
CREATE POLICY "emi_staff_update" ON emi_plans FOR UPDATE TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));

DROP POLICY IF EXISTS "emi_admin_delete" ON emi_plans;
CREATE POLICY "emi_admin_delete" ON emi_plans FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ─── INDEXES ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_invoices_customer   ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status_new ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_txn_invoice         ON payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_txn_customer        ON payment_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_txn_status          ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_refunds_customer    ON refunds(customer_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status      ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_emi_transaction     ON emi_plans(transaction_id);
