-- Allow site admins to delete any group
CREATE POLICY "Admin può eliminare qualsiasi gruppo"
ON public.gruppi
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow site admins to update any group
CREATE POLICY "Admin può modificare qualsiasi gruppo"
ON public.gruppi
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));