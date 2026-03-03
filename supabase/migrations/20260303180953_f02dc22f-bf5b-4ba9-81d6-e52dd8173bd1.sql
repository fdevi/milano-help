
-- Drop all existing restrictive policies on storage.objects for avatars
DROP POLICY IF EXISTS "Avatar pubblici in lettura" ON storage.objects;
DROP POLICY IF EXISTS "Utenti possono caricare avatar" ON storage.objects;
DROP POLICY IF EXISTS "Utenti possono aggiornare avatar" ON storage.objects;
DROP POLICY IF EXISTS "Utenti possono eliminare avatar" ON storage.objects;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "avatar_select" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

CREATE POLICY "avatar_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatar_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "avatar_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars');
