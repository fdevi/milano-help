ALTER TABLE public.notifiche 
ADD COLUMN IF NOT EXISTS riferimento_id uuid,
ADD COLUMN IF NOT EXISTS mittente_id uuid;