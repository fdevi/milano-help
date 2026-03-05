ALTER TABLE public.eventi 
  ADD COLUMN IF NOT EXISTS fine timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lat double precision DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lon double precision DEFAULT NULL;