-- ============================================
-- ESTELA POD - Seed Data
-- ============================================

-- Sample boats
INSERT INTO boats (name, berth_location, captain_name, notes) VALUES
  ('M/Y Lady Nora', 'Port Adriano, Berth 42', 'Capt. James Morrison', 'VIP client - priority handling'),
  ('M/Y Chiqui', 'Club de Mar, Berth 15', 'Capt. Carlos Ruiz', NULL),
  ('S/Y Blue Spirit', 'Marina Port de Mallorca, Berth 7', 'Capt. Henrik Larsson', 'Sailing yacht - check wind schedule'),
  ('M/Y Poseidon', 'STP Shipyard, Dock 3', 'Capt. David Chen', 'Currently in refit'),
  ('M/Y Estrella', 'Port Adriano, Berth 28', 'Capt. Maria Santos', NULL);

-- NOTE: Couriers must be created through Supabase Auth first.
-- After creating auth users in the Supabase dashboard, run:
--
-- INSERT INTO couriers (user_id, full_name, phone, role) VALUES
--   ('<auth-user-uuid-1>', 'Marco Rossi', '+34 612 345 678', 'courier'),
--   ('<auth-user-uuid-2>', 'Ana Garcia', '+34 698 765 432', 'courier'),
--   ('<auth-user-uuid-3>', 'Admin User', '+34 600 000 000', 'admin');
