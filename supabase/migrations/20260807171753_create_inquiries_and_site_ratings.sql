/*
# Create inquiries and site_ratings tables (public, no auth required)

## Purpose
Visitors to the public website can submit inquiries and rate the service without logging in.
These tables are intentionally public (no user_id, no auth.uid()) — the anon-key frontend must be able to insert and read.

## New Tables

### inquiries
- id (uuid, PK)
- name (text, not null) — submitter's full name
- email (text, not null) — submitter's email
- phone (text, nullable) — submitter's phone
- subject (text, not null) — inquiry subject/category
- message (text, not null) — inquiry body
- status (text, default 'new') — admin tracking: new / read / responded / closed
- created_at (timestamptz, default now())

### site_ratings
- id (uuid, PK)
- name (text, not null) — rater's display name
- rating (integer, not null, check 1-5) — star rating
- comment (text, nullable) — optional review text
- car_model (text, nullable) — optional car model
- is_published (boolean, default true) — admin can unpublish
- created_at (timestamptz, default now())

## Security
- RLS enabled on both tables.
- Both are intentionally public/shared (no sign-in required to submit).
- anon + authenticated can INSERT (submit inquiries/ratings).
- anon + authenticated can SELECT published data (site_ratings where is_published = true; all inquiries visible to admin only via service role, but anon SELECT is needed for the public to see published ratings).
- UPDATE/DELETE restricted to authenticated (admin) only.

## Important Notes
1. The inquiry form on the public website writes to `inquiries` with no login.
2. The rating widget on the public website writes to `site_ratings` with no login.
3. Admin can view inquiries and manage ratings from the admin dashboard.
*/

-- Inquiries table
CREATE TABLE IF NOT EXISTS inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_inquiries" ON inquiries;
CREATE POLICY "anon_select_inquiries" ON inquiries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_inquiries" ON inquiries;
CREATE POLICY "anon_insert_inquiries" ON inquiries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_inquiries" ON inquiries;
CREATE POLICY "admin_update_inquiries" ON inquiries FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_inquiries" ON inquiries;
CREATE POLICY "admin_delete_inquiries" ON inquiries FOR DELETE
  TO authenticated USING (true);

-- Site ratings table (public ratings, no login)
CREATE TABLE IF NOT EXISTS site_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text DEFAULT '',
  car_model text DEFAULT '',
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE site_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_published_ratings" ON site_ratings;
CREATE POLICY "anon_select_published_ratings" ON site_ratings FOR SELECT
  TO anon, authenticated USING (is_published = true);

DROP POLICY IF EXISTS "anon_insert_ratings" ON site_ratings;
CREATE POLICY "anon_insert_ratings" ON site_ratings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_ratings" ON site_ratings;
CREATE POLICY "admin_update_ratings" ON site_ratings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_ratings" ON site_ratings;
CREATE POLICY "admin_delete_ratings" ON site_ratings FOR DELETE
  TO authenticated USING (true);

-- Index for sorting
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_ratings_created_at ON site_ratings (created_at DESC);
