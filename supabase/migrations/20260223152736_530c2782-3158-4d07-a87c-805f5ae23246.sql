
-- Ensure all existing profiles have profilo_pubblico = true (fix NULLs)
UPDATE profiles SET profilo_pubblico = true WHERE profilo_pubblico IS NULL;

-- Drop the restrictive SELECT policy and replace with one that allows all authenticated users to read basic profile info
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON profiles;

CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');
