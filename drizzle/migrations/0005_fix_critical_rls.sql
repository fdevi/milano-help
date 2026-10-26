-- password_resets: server-only
GRANT ALL ON public.password_resets TO service_role;
REVOKE ALL ON public.password_resets FROM anon, authenticated;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

-- annunci: inserts must belong to the caller
DROP POLICY IF EXISTS enable_insert_for_authenticated ON public.annunci;

-- eventi_partecipanti: own rows, organizer, admins; public counts via function
DROP POLICY IF EXISTS "Anyone can view event participants" ON public.eventi_partecipanti;
CREATE POLICY "Participants visible to self, organizer and admins" ON public.eventi_partecipanti
FOR SELECT TO authenticated USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.eventi e WHERE e.id = evento_id AND e.organizzatore_id = auth.uid())
);
CREATE OR REPLACE FUNCTION public.conta_partecipanti_evento(_evento_id uuid)
RETURNS TABLE(confermati integer, forse integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*) FILTER (WHERE stato = 'confermato')::int, count(*) FILTER (WHERE stato = 'forse')::int
  FROM public.eventi_partecipanti WHERE evento_id = _evento_id
$$;
GRANT EXECUTE ON FUNCTION public.conta_partecipanti_evento(uuid) TO anon, authenticated;

-- gruppi_membri: signed-in users, for public groups or groups they belong to
DROP POLICY IF EXISTS "Anyone can view members" ON public.gruppi_membri;
CREATE POLICY "Members visible within group context" ON public.gruppi_membri
FOR SELECT TO authenticated USING (
  auth.uid() = user_id
  OR public.is_group_member(auth.uid(), gruppo_id)
  OR public.is_group_creator(auth.uid(), gruppo_id)
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.gruppi g WHERE g.id = gruppo_id AND g.tipo = 'pubblico')
);

-- messaggi_privati_piace: only conversation participants
DROP POLICY IF EXISTS view_msg_privati_likes ON public.messaggi_privati_piace;
CREATE POLICY "Conversation participants view likes" ON public.messaggi_privati_piace
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.messaggi_privati m
    JOIN public.conversazioni_private c ON c.id = m.conversazione_id
    WHERE m.id = messaggio_id AND auth.uid() IN (c.acquirente_id, c.venditore_id)
  )
);