
-- Drop ALL existing policies on gruppi_membri
DROP POLICY IF EXISTS "Users can view members" ON gruppi_membri;
DROP POLICY IF EXISTS "Users can join groups" ON gruppi_membri;
DROP POLICY IF EXISTS "Admins can manage members" ON gruppi_membri;
DROP POLICY IF EXISTS "view_membri" ON gruppi_membri;
DROP POLICY IF EXISTS "join_gruppi" ON gruppi_membri;
DROP POLICY IF EXISTS "update_membri" ON gruppi_membri;
DROP POLICY IF EXISTS "delete_membri" ON gruppi_membri;

-- 1. INSERT - anyone authenticated can join
CREATE POLICY "Anyone can join groups" ON gruppi_membri
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. SELECT - public visibility
CREATE POLICY "Anyone can view members" ON gruppi_membri
FOR SELECT USING (true);

-- 3. UPDATE - group creator or group admin
CREATE POLICY "Admins can update members" ON gruppi_membri
FOR UPDATE USING (
  auth.uid() IN (
    SELECT creatore_id FROM gruppi WHERE id = gruppo_id
  )
  OR is_group_admin(auth.uid(), gruppo_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 4. DELETE - self, group creator, group admin, or site admin
CREATE POLICY "Members can leave or be removed" ON gruppi_membri
FOR DELETE USING (
  auth.uid() = user_id
  OR auth.uid() IN (SELECT creatore_id FROM gruppi WHERE id = gruppo_id)
  OR is_group_admin(auth.uid(), gruppo_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);
