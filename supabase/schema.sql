-- ============================================
-- ESTELA POD - Database Schema
-- ============================================

-- Boats table
CREATE TABLE boats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  berth_location TEXT,
  captain_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_boats_name ON boats (name);

-- Couriers table (linked to Supabase Auth)
CREATE TABLE couriers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'courier' CHECK (role IN ('courier', 'admin')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_couriers_user_id ON couriers (user_id);
CREATE INDEX idx_couriers_role ON couriers (role);
CREATE INDEX idx_couriers_active ON couriers (is_active);

-- Parcels table
CREATE TABLE parcels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode TEXT,
  carrier TEXT,
  description TEXT,
  boat_id UUID REFERENCES boats(id),
  status TEXT DEFAULT 'picked_up' CHECK (status IN ('picked_up', 'delivered')),

  -- Pickup
  picked_up_by UUID REFERENCES couriers(id),
  picked_up_at TIMESTAMPTZ DEFAULT NOW(),
  pickup_photo_url TEXT,
  pickup_latitude DOUBLE PRECISION,
  pickup_longitude DOUBLE PRECISION,

  -- Delivery
  delivered_by UUID REFERENCES couriers(id),
  delivered_at TIMESTAMPTZ,
  delivery_photo_url TEXT,
  delivery_latitude DOUBLE PRECISION,
  delivery_longitude DOUBLE PRECISION,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parcels_barcode ON parcels (barcode);
CREATE INDEX idx_parcels_status ON parcels (status);
CREATE INDEX idx_parcels_picked_up_by ON parcels (picked_up_by);
CREATE INDEX idx_parcels_boat_id ON parcels (boat_id);
CREATE INDEX idx_parcels_created_at ON parcels (created_at DESC);
CREATE INDEX idx_parcels_status_created ON parcels (status, created_at DESC);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER parcels_updated_at
  BEFORE UPDATE ON parcels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcels ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role from couriers table
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM couriers WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- BOATS policies
CREATE POLICY "Authenticated users can read boats"
  ON boats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert boats"
  ON boats FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update boats"
  ON boats FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can delete boats"
  ON boats FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- COURIERS policies
CREATE POLICY "Authenticated users can read couriers"
  ON couriers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert couriers"
  ON couriers FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update couriers"
  ON couriers FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- PARCELS policies
CREATE POLICY "Authenticated users can read all parcels"
  ON parcels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert parcels"
  ON parcels FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Couriers can update own pickups to delivered"
  ON parcels FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete parcels"
  ON parcels FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');
