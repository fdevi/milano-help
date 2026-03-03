
CREATE POLICY "Users can insert own email changes"
  ON public.email_changes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
