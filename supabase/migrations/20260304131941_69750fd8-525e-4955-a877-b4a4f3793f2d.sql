
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS partita_iva text,
  ADD COLUMN IF NOT EXISTS nome_attivita text,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lon double precision,
  ADD COLUMN IF NOT EXISTS privacy_consensi jsonb DEFAULT '{}';
