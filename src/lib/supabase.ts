import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'customer' | 'mechanic' | 'staff' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  avatar_url: string;
  role: UserRole;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  owner_id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  vin: string;
  color: string;
  fuel_type: 'petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid';
  transmission: 'manual' | 'automatic';
  mileage: number;
  last_service_date: string | null;
  image_url: string;
  notes: string;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  base_price: number;
  duration_minutes: number;
  is_active: boolean;
  image_url: string;
  created_at: string;
}

export interface Booking {
  id: string;
  booking_number: string;
  customer_id: string | null;
  vehicle_id: string | null;
  service_id: string | null;
  scheduled_date: string;
  scheduled_time: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  pickup_required: boolean;
  pickup_address: string;
  drop_required: boolean;
  drop_address: string;
  special_instructions: string;
  estimated_cost: number;
  actual_cost: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  vehicle_info: string;
  gst_percentage: number;
  gst_amount: number;
  created_at: string;
  updated_at: string;
  services?: Service;
}

export interface JobCard {
  id: string;
  job_number: string;
  booking_id: string;
  assigned_mechanic_id: string | null;
  status: 'open' | 'in_progress' | 'on_hold' | 'completed' | 'closed';
  diagnosis: string;
  work_done: string;
  technician_notes: string;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  updated_at: string;
  bookings?: Booking;
  profiles?: Profile;
}

export interface SparePart {
  id: string;
  name: string;
  part_number: string;
  category: string;
  description: string;
  quantity: number;
  unit_price: number;
  reorder_level: number;
  supplier: string;
  location: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  booking_id: string;
  customer_id: string | null;
  subtotal: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  payment_status: 'unpaid' | 'partial' | 'paid' | 'refunded';
  due_date: string | null;
  notes: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  created_at: string;
  bookings?: Booking;
  profiles?: Profile;
}

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  vehicle_number: string;
  vehicle_make: string;
  vehicle_model: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerMessage {
  id: string;
  customer_id: string | null;
  booking_id: string | null;
  channel: 'whatsapp' | 'sms' | 'email';
  subject: string;
  body: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered' | 'read';
  sent_at: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  customer_id: string;
  rating: number;
  comment: string;
  is_published: boolean;
  created_at: string;
  profiles?: Profile;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'booking' | 'payment' | 'reminder';
  is_read: boolean;
  link: string;
  created_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  author_id: string | null;
  category: string;
  tags: string[];
  is_published: boolean;
  published_at: string | null;
  views: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}
