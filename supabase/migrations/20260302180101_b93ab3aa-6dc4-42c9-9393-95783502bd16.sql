ALTER TABLE public.eventi ADD COLUMN IF NOT EXISTS visualizzazioni integer NOT NULL DEFAULT 0;

-- Create RPC function for atomic increment (like annunci)
CREATE OR REPLACE FUNCTION public.incrementa_visualizzazioni_evento(_evento_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE eventi SET visualizzazioni = visualizzazioni + 1 WHERE id = _evento_id;
$$;