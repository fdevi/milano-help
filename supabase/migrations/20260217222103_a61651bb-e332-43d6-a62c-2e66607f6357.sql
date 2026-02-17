
-- Create tables
CREATE TABLE public.gruppi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descrizione TEXT,
  immagine TEXT,
  tipo TEXT NOT NULL DEFAULT 'pubblico',
  creatore_id UUID NOT NULL,
  categoria TEXT,
  quartiere TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.gruppi_membri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gruppo_id UUID NOT NULL REFERENCES public.gruppi(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  ruolo TEXT NOT NULL DEFAULT 'membro',
  stato TEXT NOT NULL DEFAULT 'approvato',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(gruppo_id, user_id)
);

CREATE TABLE public.gruppi_messaggi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gruppo_id UUID NOT NULL REFERENCES public.gruppi(id) ON DELETE CASCADE,
  mittente_id UUID NOT NULL,
  testo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.annunci_commenti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annuncio_id UUID NOT NULL REFERENCES public.annunci(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  testo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.annunci_commenti_piace (
  user_id UUID NOT NULL,
  commento_id UUID NOT NULL REFERENCES public.annunci_commenti(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, commento_id)
);

CREATE TABLE public.notifiche (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL,
  titolo TEXT NOT NULL,
  messaggio TEXT,
  link TEXT,
  letta BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gruppi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gruppi_membri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gruppi_messaggi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annunci_commenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annunci_commenti_piace ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifiche ENABLE ROW LEVEL SECURITY;

-- Gruppi policies
CREATE POLICY "view_gruppi" ON public.gruppi FOR SELECT USING (
  tipo = 'pubblico' OR creatore_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM public.gruppi_membri gm WHERE gm.gruppo_id = gruppi.id AND gm.user_id = auth.uid() AND gm.stato = 'approvato')
);
CREATE POLICY "create_gruppi" ON public.gruppi FOR INSERT WITH CHECK (auth.uid() = creatore_id);
CREATE POLICY "update_gruppi" ON public.gruppi FOR UPDATE USING (auth.uid() = creatore_id);
CREATE POLICY "delete_gruppi" ON public.gruppi FOR DELETE USING (auth.uid() = creatore_id);

-- Gruppi membri policies
CREATE POLICY "view_membri" ON public.gruppi_membri FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.gruppi g WHERE g.id = gruppo_id AND g.tipo = 'pubblico')
  OR user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.gruppi_membri gm2 WHERE gm2.gruppo_id = gruppi_membri.gruppo_id AND gm2.user_id = auth.uid() AND gm2.stato = 'approvato')
);
CREATE POLICY "join_gruppi" ON public.gruppi_membri FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_membri" ON public.gruppi_membri FOR UPDATE USING (
  auth.uid() = user_id 
  OR EXISTS (SELECT 1 FROM public.gruppi_membri gm2 WHERE gm2.gruppo_id = gruppi_membri.gruppo_id AND gm2.user_id = auth.uid() AND gm2.ruolo = 'admin' AND gm2.stato = 'approvato')
);
CREATE POLICY "delete_membri" ON public.gruppi_membri FOR DELETE USING (
  auth.uid() = user_id 
  OR EXISTS (SELECT 1 FROM public.gruppi_membri gm2 WHERE gm2.gruppo_id = gruppi_membri.gruppo_id AND gm2.user_id = auth.uid() AND gm2.ruolo = 'admin' AND gm2.stato = 'approvato')
);

-- Gruppi messaggi policies
CREATE POLICY "view_group_msg" ON public.gruppi_messaggi FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.gruppi_membri gm WHERE gm.gruppo_id = gruppi_messaggi.gruppo_id AND gm.user_id = auth.uid() AND gm.stato = 'approvato')
);
CREATE POLICY "send_group_msg" ON public.gruppi_messaggi FOR INSERT WITH CHECK (
  auth.uid() = mittente_id 
  AND EXISTS (SELECT 1 FROM public.gruppi_membri gm WHERE gm.gruppo_id = gruppi_messaggi.gruppo_id AND gm.user_id = auth.uid() AND gm.stato = 'approvato')
);

-- Commenti policies
CREATE POLICY "view_comments" ON public.annunci_commenti FOR SELECT USING (true);
CREATE POLICY "create_comments" ON public.annunci_commenti FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_comments" ON public.annunci_commenti FOR DELETE USING (
  auth.uid() = user_id 
  OR EXISTS (SELECT 1 FROM public.annunci a WHERE a.id = annuncio_id AND a.user_id = auth.uid())
);

-- Comment likes policies
CREATE POLICY "view_comment_likes" ON public.annunci_commenti_piace FOR SELECT USING (true);
CREATE POLICY "like_comments" ON public.annunci_commenti_piace FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "unlike_comments" ON public.annunci_commenti_piace FOR DELETE USING (auth.uid() = user_id);

-- Notifiche policies
CREATE POLICY "view_notifiche" ON public.notifiche FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "create_notifiche" ON public.notifiche FOR INSERT WITH CHECK (true);
CREATE POLICY "update_notifiche" ON public.notifiche FOR UPDATE USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.gruppi_messaggi;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifiche;
