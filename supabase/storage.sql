-- ============================================
-- ESTELA POD - Storage Configuration
-- ============================================

-- Create the parcel-photos bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('parcel-photos', 'parcel-photos', false);

-- Authenticated users can upload photos to pickup/ and delivery/ folders
CREATE POLICY "Authenticated users can upload parcel photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'parcel-photos'
    AND (storage.foldername(name))[1] IN ('pickup', 'delivery')
  );

-- Authenticated users can read all parcel photos
CREATE POLICY "Authenticated users can read parcel photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'parcel-photos');

-- Admins can delete parcel photos
CREATE POLICY "Admins can delete parcel photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'parcel-photos'
    AND (SELECT get_user_role()) = 'admin'
  );
