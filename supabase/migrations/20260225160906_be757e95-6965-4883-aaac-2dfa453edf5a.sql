-- Fix: replace direct user_roles subquery with has_role() SECURITY DEFINER function
DROP POLICY IF EXISTS "Admin can read activity_logs" ON activity_logs;
CREATE POLICY "Admin can read activity_logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));