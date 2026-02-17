
-- Add contact visibility columns to annunci
ALTER TABLE public.annunci ADD COLUMN IF NOT EXISTS mostra_email boolean NOT NULL DEFAULT false;
ALTER TABLE public.annunci ADD COLUMN IF NOT EXISTS mostra_telefono boolean NOT NULL DEFAULT false;

-- Add mi_piace counter
ALTER TABLE public.annunci ADD COLUMN IF NOT EXISTS mi_piace integer NOT NULL DEFAULT 0;

-- Create likes tracking table
CREATE TABLE public.annunci_mi_piace (
  user_id uuid NOT NULL,
  annuncio_id uuid NOT NULL REFERENCES public.annunci(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, annuncio_id)
);

ALTER TABLE public.annunci_mi_piace ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view likes" ON public.annunci_mi_piace
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like" ON public.annunci_mi_piace
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike" ON public.annunci_mi_piace
  FOR DELETE USING (auth.uid() = user_id);
