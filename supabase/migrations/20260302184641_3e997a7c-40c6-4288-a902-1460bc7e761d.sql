
-- Tabella partecipanti eventi
CREATE TABLE public.eventi_partecipanti (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id uuid NOT NULL REFERENCES public.eventi(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stato text NOT NULL DEFAULT 'confermato',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(evento_id, user_id)
);

ALTER TABLE public.eventi_partecipanti ENABLE ROW LEVEL SECURITY;

-- RLS: lettura pubblica
CREATE POLICY "Anyone can view event participants"
  ON public.eventi_partecipanti FOR SELECT
  USING (true);

-- RLS: inserimento solo per l'utente
CREATE POLICY "Users can join events"
  ON public.eventi_partecipanti FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS: aggiornamento solo per l'utente
CREATE POLICY "Users can update own participation"
  ON public.eventi_partecipanti FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS: cancellazione solo per l'utente
CREATE POLICY "Users can leave events"
  ON public.eventi_partecipanti FOR DELETE
  USING (auth.uid() = user_id);
