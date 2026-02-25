-- Enable realtime for chat-related tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messaggi_privati;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messaggi_letti;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messaggi_privati_letti;

-- Create an RPC to atomically increment view count
CREATE OR REPLACE FUNCTION public.incrementa_visualizzazioni(_annuncio_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE annunci SET visualizzazioni = visualizzazioni + 1 WHERE id = _annuncio_id;
$$;