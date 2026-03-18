
DROP POLICY IF EXISTS "create_gruppi" ON public.gruppi;
CREATE POLICY "create_gruppi" ON public.gruppi
  FOR INSERT TO public
  WITH CHECK (
    (auth.uid() = creatore_id) OR has_role(auth.uid(), 'admin'::app_role)
  );
