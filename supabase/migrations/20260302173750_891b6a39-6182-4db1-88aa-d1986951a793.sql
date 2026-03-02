
-- Table for event likes
CREATE TABLE public.eventi_mi_piace (
  evento_id uuid NOT NULL REFERENCES public.eventi(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (evento_id, user_id)
);

ALTER TABLE public.eventi_mi_piace ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view event likes" ON public.eventi_mi_piace FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like events" ON public.eventi_mi_piace FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike events" ON public.eventi_mi_piace FOR DELETE USING (auth.uid() = user_id);

-- Table for event comments
CREATE TABLE public.eventi_commenti (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id uuid NOT NULL REFERENCES public.eventi(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  testo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.eventi_commenti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view event comments" ON public.eventi_commenti FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment events" ON public.eventi_commenti FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own event comments" ON public.eventi_commenti FOR DELETE USING (auth.uid() = user_id);

-- Add mi_piace counter to eventi table
ALTER TABLE public.eventi ADD COLUMN IF NOT EXISTS mi_piace integer NOT NULL DEFAULT 0;
