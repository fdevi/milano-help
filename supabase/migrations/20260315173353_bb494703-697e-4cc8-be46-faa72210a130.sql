
-- Add contenuto_speciale column to annunci
ALTER TABLE public.annunci ADD COLUMN IF NOT EXISTS contenuto_speciale text DEFAULT NULL;

-- Create recensioni table
CREATE TABLE IF NOT EXISTS public.recensioni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annuncio_id uuid REFERENCES public.annunci(id) ON DELETE CASCADE NOT NULL,
  utente_id uuid NOT NULL,
  voto integer NOT NULL CHECK (voto >= 1 AND voto <= 5),
  commento text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add unique constraint to prevent duplicate reviews
ALTER TABLE public.recensioni ADD CONSTRAINT recensioni_unique_review UNIQUE (annuncio_id, utente_id);

-- Enable RLS
ALTER TABLE public.recensioni ENABLE ROW LEVEL SECURITY;

-- RLS policies for recensioni
CREATE POLICY "Anyone can view recensioni" ON public.recensioni FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create recensioni" ON public.recensioni FOR INSERT TO authenticated WITH CHECK (auth.uid() = utente_id);
CREATE POLICY "Users can update own recensioni" ON public.recensioni FOR UPDATE TO authenticated USING (auth.uid() = utente_id);
CREATE POLICY "Users can delete own recensioni" ON public.recensioni FOR DELETE TO authenticated USING (auth.uid() = utente_id);
