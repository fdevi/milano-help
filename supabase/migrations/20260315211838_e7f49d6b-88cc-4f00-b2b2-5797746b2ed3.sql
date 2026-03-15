
-- Add categoria_attivita field for business type badge
ALTER TABLE public.annunci ADD COLUMN IF NOT EXISTS categoria_attivita text DEFAULT NULL;

-- Allow admin to delete reviews
CREATE POLICY "Admin can delete recensioni"
ON public.recensioni
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admin to update reviews
CREATE POLICY "Admin can update recensioni"
ON public.recensioni
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
