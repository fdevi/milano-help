-- RPC: restituisce le linee (route_short_name + route_type) distinte per ogni stop_id nella lista.
-- Usata dalla lista fermate (vista 1) per badge con colori e forme (metro M1/M2/M3/M5, bus, tram, altro).
CREATE OR REPLACE FUNCTION public.fermate_con_linee(stop_ids text[])
RETURNS TABLE(stop_id text, route_short_name text, route_type integer)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT st.stop_id, r.route_short_name, r.route_type
  FROM stop_times_atm st
  JOIN trips_atm t ON st.trip_id = t.trip_id
  JOIN routes_atm r ON t.route_id = r.route_id
  WHERE st.stop_id = ANY(stop_ids)
  AND r.route_short_name IS NOT NULL;
$$;
