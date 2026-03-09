
CREATE TABLE public.fermate_atm (
    stop_id TEXT PRIMARY KEY,
    stop_name TEXT,
    stop_lat DOUBLE PRECISION,
    stop_lon DOUBLE PRECISION
);

ALTER TABLE public.fermate_atm ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read fermate_atm"
ON public.fermate_atm
FOR SELECT
TO public
USING (true);
