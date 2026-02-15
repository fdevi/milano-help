
-- Tabella conversazioni
CREATE TABLE public.conversazioni (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  utente1_id UUID NOT NULL,
  utente2_id UUID NOT NULL,
  servizio_id UUID,
  ultimo_messaggio TEXT DEFAULT '',
  ultimo_aggiornamento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conversazioni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
ON public.conversazioni FOR SELECT
TO authenticated
USING (auth.uid() = utente1_id OR auth.uid() = utente2_id);

CREATE POLICY "Users can create conversations"
ON public.conversazioni FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = utente1_id OR auth.uid() = utente2_id);

CREATE POLICY "Users can update their own conversations"
ON public.conversazioni FOR UPDATE
TO authenticated
USING (auth.uid() = utente1_id OR auth.uid() = utente2_id);

-- Tabella messaggi
CREATE TABLE public.messaggi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversazione_id UUID NOT NULL REFERENCES public.conversazioni(id) ON DELETE CASCADE,
  mittente_id UUID NOT NULL,
  testo TEXT NOT NULL,
  allegato_url TEXT,
  letto BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messaggi ENABLE ROW LEVEL SECURITY;

-- Only conversation participants can read messages
CREATE POLICY "Participants can view messages"
ON public.messaggi FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversazioni c
    WHERE c.id = conversazione_id
    AND (auth.uid() = c.utente1_id OR auth.uid() = c.utente2_id)
  )
);

CREATE POLICY "Participants can insert messages"
ON public.messaggi FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = mittente_id
  AND EXISTS (
    SELECT 1 FROM public.conversazioni c
    WHERE c.id = conversazione_id
    AND (auth.uid() = c.utente1_id OR auth.uid() = c.utente2_id)
  )
);

CREATE POLICY "Participants can update messages (mark read)"
ON public.messaggi FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversazioni c
    WHERE c.id = conversazione_id
    AND (auth.uid() = c.utente1_id OR auth.uid() = c.utente2_id)
  )
);

-- Indexes
CREATE INDEX idx_messaggi_conversazione ON public.messaggi(conversazione_id);
CREATE INDEX idx_messaggi_created_at ON public.messaggi(created_at);
CREATE INDEX idx_conversazioni_utente1 ON public.conversazioni(utente1_id);
CREATE INDEX idx_conversazioni_utente2 ON public.conversazioni(utente2_id);

-- Enable realtime for messaggi
ALTER PUBLICATION supabase_realtime ADD TABLE public.messaggi;
