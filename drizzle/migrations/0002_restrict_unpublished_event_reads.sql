DROP POLICY IF EXISTS "Chiunque può vedere gli eventi" ON public.eventi;
DROP POLICY IF EXISTS "Eventi visibili a tutti" ON public.eventi;
GRANT SELECT ON public.eventi TO anon, authenticated;
ALTER TABLE public.eventi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published events are public" ON public.eventi FOR SELECT TO anon, authenticated USING (stato = 'attivo');
CREATE POLICY "Owners can read their unpublished events" ON public.eventi FOR SELECT TO authenticated USING (organizzatore_id = auth.uid());
CREATE POLICY "Admins can read all events" ON public.eventi FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));