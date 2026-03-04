
-- Add expiry columns to annunci
ALTER TABLE public.annunci
  ADD COLUMN IF NOT EXISTS data_scadenza timestamp with time zone,
  ADD COLUMN IF NOT EXISTS proroghe_effettuate integer NOT NULL DEFAULT 0;

-- Set data_scadenza for existing active annunci (45 days from now)
UPDATE public.annunci
SET data_scadenza = now() + interval '45 days'
WHERE stato = 'attivo' AND data_scadenza IS NULL;

-- Trigger function: auto-set data_scadenza when stato becomes 'attivo'
CREATE OR REPLACE FUNCTION public.set_annuncio_scadenza()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.stato IS DISTINCT FROM NEW.stato AND NEW.stato = 'attivo' AND NEW.data_scadenza IS NULL THEN
    NEW.data_scadenza := now() + interval '45 days';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_set_annuncio_scadenza ON public.annunci;
CREATE TRIGGER trg_set_annuncio_scadenza
  BEFORE UPDATE ON public.annunci
  FOR EACH ROW
  EXECUTE FUNCTION public.set_annuncio_scadenza();
