-- Tabella di lookup pre-calcolata: stop_id → linee che passano
CREATE TABLE IF NOT EXISTS public.fermate_linee_lookup (
  stop_id text NOT NULL,
  route_short_name text NOT NULL,
  route_type integer NOT NULL DEFAULT 3,
  PRIMARY KEY (stop_id, route_short_name)
);

-- Popola la tabella
INSERT INTO public.fermate_linee_lookup (stop_id, route_short_name, route_type)
SELECT DISTINCT st.stop_id, r.route_short_name, r.route_type
FROM stop_times_atm st
JOIN trips_atm t ON st.trip_id = t.trip_id
JOIN routes_atm r ON t.route_id = r.route_id
WHERE r.route_short_name IS NOT NULL
ON CONFLICT DO NOTHING;

-- RLS: lettura pubblica
ALTER TABLE public.fermate_linee_lookup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read fermate_linee_lookup"
  ON public.fermate_linee_lookup FOR SELECT
  TO public USING (true);

-- Aggiorna la RPC per usare la lookup table (istantanea)
CREATE OR REPLACE FUNCTION public.fermate_con_linee(stop_ids text[])
RETURNS TABLE(stop_id text, route_short_name text, route_type integer)
LANGUAGE sql STABLE
SET search_path = 'public'
AS $$
  SELECT l.stop_id, l.route_short_name, l.route_type
  FROM fermate_linee_lookup l
  WHERE l.stop_id = ANY(stop_ids)
  ORDER BY l.stop_id, l.route_short_name;
$$;