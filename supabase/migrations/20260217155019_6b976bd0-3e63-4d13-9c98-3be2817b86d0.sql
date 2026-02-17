
-- Add admin-only INSERT, UPDATE, DELETE policies for categorie
CREATE POLICY "Admin can insert categories"
ON public.categorie FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update categories"
ON public.categorie FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete categories"
ON public.categorie FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
