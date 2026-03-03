
-- Drop existing avatar policies
DROP POLICY IF EXISTS "Avatar pubblici in lettura" ON storage.objects;
DROP POLICY IF EXISTS "Utenti possono caricare avatar" ON storage.objects;
DROP POLICY IF EXISTS "Utenti possono aggiornare avatar" ON storage.objects;
DROP POLICY IF EXISTS "Utenti possono eliminare avatar" ON storage.objects;

-- Simplified policies without folder restriction
CREATE POLICY "Avatar pubblici in lettura" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Utenti possono caricare avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Utenti possono aggiornare avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Utenti possono eliminare avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);
