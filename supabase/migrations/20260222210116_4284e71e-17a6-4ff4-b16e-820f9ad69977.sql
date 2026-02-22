
-- Create security definer functions to avoid recursion

-- Check if user is an approved member of a group
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _gruppo_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gruppi_membri
    WHERE user_id = _user_id
      AND gruppo_id = _gruppo_id
      AND stato = 'approvato'
  );
$$;

-- Check if user is group admin (role='admin' and approved)
CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id uuid, _gruppo_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gruppi_membri
    WHERE user_id = _user_id
      AND gruppo_id = _gruppo_id
      AND ruolo = 'admin'
      AND stato = 'approvato'
  );
$$;

-- Check if user is the group creator
CREATE OR REPLACE FUNCTION public.is_group_creator(_user_id uuid, _gruppo_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gruppi
    WHERE id = _gruppo_id
      AND creatore_id = _user_id
  );
$$;

-- Drop all existing policies on gruppi_membri
DROP POLICY IF EXISTS "view_membri" ON gruppi_membri;
DROP POLICY IF EXISTS "join_gruppi" ON gruppi_membri;
DROP POLICY IF EXISTS "Utenti possono unirsi ai gruppi" ON gruppi_membri;
DROP POLICY IF EXISTS "delete_membri" ON gruppi_membri;
DROP POLICY IF EXISTS "update_membri" ON gruppi_membri;
DROP POLICY IF EXISTS "Users can view members" ON gruppi_membri;
DROP POLICY IF EXISTS "Users can join groups" ON gruppi_membri;
DROP POLICY IF EXISTS "Admins can manage members" ON gruppi_membri;

-- SELECT: members can see other members, creators can see all, site admins can see all
CREATE POLICY "view_membri" ON gruppi_membri
FOR SELECT USING (
  is_group_member(auth.uid(), gruppo_id)
  OR is_group_creator(auth.uid(), gruppo_id)
  OR has_role(auth.uid(), 'admin')
);

-- INSERT: any authenticated user can join (self only)
CREATE POLICY "join_gruppi" ON gruppi_membri
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- UPDATE: group admins, group creators, or site admins
CREATE POLICY "update_membri" ON gruppi_membri
FOR UPDATE USING (
  is_group_admin(auth.uid(), gruppo_id)
  OR is_group_creator(auth.uid(), gruppo_id)
  OR has_role(auth.uid(), 'admin')
);

-- DELETE: self, group admins, group creators, or site admins
CREATE POLICY "delete_membri" ON gruppi_membri
FOR DELETE USING (
  auth.uid() = user_id
  OR is_group_admin(auth.uid(), gruppo_id)
  OR is_group_creator(auth.uid(), gruppo_id)
  OR has_role(auth.uid(), 'admin')
);
