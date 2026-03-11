ALTER TABLE public.eventi ADD COLUMN IF NOT EXISTS external_id TEXT DEFAULT NULL;
ALTER TABLE public.eventi ADD COLUMN IF NOT EXISTS fonte_esterna TEXT DEFAULT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_eventi_external_id ON public.eventi(external_id) WHERE external_id IS NOT NULL;