
ALTER TABLE public.annunci_commenti ADD COLUMN parent_id uuid REFERENCES public.annunci_commenti(id) ON DELETE CASCADE DEFAULT NULL;
ALTER TABLE public.eventi_commenti ADD COLUMN parent_id uuid REFERENCES public.eventi_commenti(id) ON DELETE CASCADE DEFAULT NULL;
