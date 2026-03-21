CREATE POLICY "Users can read own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());