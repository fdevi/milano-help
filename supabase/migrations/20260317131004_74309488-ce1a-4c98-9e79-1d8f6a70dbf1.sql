
-- Add images array to group messages (posts)
ALTER TABLE public.gruppi_messaggi ADD COLUMN IF NOT EXISTS immagini text[] DEFAULT '{}';

-- Comments on group posts (2-level nesting)
CREATE TABLE public.gruppi_post_commenti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.gruppi_messaggi(id) ON DELETE CASCADE,
  gruppo_id uuid NOT NULL REFERENCES public.gruppi(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  testo text NOT NULL,
  parent_id uuid REFERENCES public.gruppi_post_commenti(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gruppi_post_commenti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_post_comments" ON public.gruppi_post_commenti
FOR SELECT USING (
  EXISTS (SELECT 1 FROM gruppi_membri gm WHERE gm.gruppo_id = gruppi_post_commenti.gruppo_id AND gm.user_id = auth.uid() AND gm.stato = 'approvato')
);

CREATE POLICY "create_post_comments" ON public.gruppi_post_commenti
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM gruppi_membri gm WHERE gm.gruppo_id = gruppi_post_commenti.gruppo_id AND gm.user_id = auth.uid() AND gm.stato = 'approvato')
);

CREATE POLICY "delete_own_post_comments" ON public.gruppi_post_commenti
FOR DELETE USING (auth.uid() = user_id);

-- Shares/reposts
CREATE TABLE public.gruppi_post_condivisioni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_originale_id uuid NOT NULL REFERENCES public.gruppi_messaggi(id) ON DELETE CASCADE,
  gruppo_destinazione_id uuid REFERENCES public.gruppi(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'gruppo',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gruppi_post_condivisioni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_post_shares" ON public.gruppi_post_condivisioni FOR SELECT USING (true);
CREATE POLICY "create_post_shares" ON public.gruppi_post_condivisioni FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.gruppi_post_commenti;
