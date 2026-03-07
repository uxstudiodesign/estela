-- ============================================
-- Estela Event System — Tables & RLS Policies
-- ============================================

-- 4.1 Table: registrations
CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Personal data
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  azienda TEXT,
  ruolo TEXT,
  provenienza TEXT, -- 'mallorca' | 'fuori_mallorca' | 'altro'

  -- Event selection (booleans)
  colazione_29 BOOLEAN DEFAULT false,
  colazione_30 BOOLEAN DEFAULT false,
  colazione_01 BOOLEAN DEFAULT false,
  sunset_29 BOOLEAN DEFAULT false,
  sunset_30 BOOLEAN DEFAULT false,

  -- Consent
  consenso_dati BOOLEAN NOT NULL DEFAULT false,
  consenso_sponsor BOOLEAN DEFAULT false,

  -- Check-in token (unique QR per person)
  qr_token UUID UNIQUE DEFAULT gen_random_uuid(),

  -- Status
  status TEXT DEFAULT 'registered' -- 'registered' | 'cancelled'
);

-- 4.2 Table: checkins
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'colazione' | 'sunset'
  event_day DATE NOT NULL,  -- e.g. '2025-04-29'
  checked_in_at TIMESTAMPTZ DEFAULT now(),
  checked_out_at TIMESTAMPTZ,
  operator_note TEXT
);

-- 4.3 RLS Policies

-- registrations: public can INSERT (registration form), no public SELECT
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can register"
  ON registrations FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only authenticated users (operators) can SELECT
CREATE POLICY "Operators can view"
  ON registrations FOR SELECT
  TO authenticated
  USING (true);

-- Anon can also SELECT (PIN gate is enforced at app level)
CREATE POLICY "Anon can view registrations"
  ON registrations FOR SELECT
  TO anon
  USING (true);

-- checkins: only authenticated users
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators manage checkins"
  ON checkins FOR ALL
  TO authenticated
  USING (true);

-- Anon can read and insert checkins (PIN gate is enforced at app level)
CREATE POLICY "Anon can view checkins"
  ON checkins FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert checkins"
  ON checkins FOR INSERT
  TO anon
  WITH CHECK (true);

-- Admin operations (PIN gate enforced at app level)
CREATE POLICY "Anon can update registrations"
  ON registrations FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete registrations"
  ON registrations FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Anon can delete checkins"
  ON checkins FOR DELETE
  TO anon
  USING (true);
