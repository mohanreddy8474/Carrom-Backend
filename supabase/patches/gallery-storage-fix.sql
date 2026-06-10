-- Run in Supabase SQL Editor if gallery photo upload fails with RLS / permission errors.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gallery',
  'gallery',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[];

DROP POLICY IF EXISTS "gallery_public_read" ON storage.objects;
DROP POLICY IF EXISTS "gallery_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "gallery_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "gallery_admin_update" ON storage.objects;

CREATE POLICY "gallery_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery');

CREATE POLICY "gallery_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'gallery' AND is_admin());

CREATE POLICY "gallery_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'gallery' AND is_admin());

CREATE POLICY "gallery_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'gallery' AND is_admin());
