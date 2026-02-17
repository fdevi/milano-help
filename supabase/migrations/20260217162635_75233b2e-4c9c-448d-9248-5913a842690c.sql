
CREATE POLICY "Admin can insert categorie_annunci"
ON public.categorie_annunci FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update categorie_annunci"
ON public.categorie_annunci FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete categorie_annunci"
ON public.categorie_annunci FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
