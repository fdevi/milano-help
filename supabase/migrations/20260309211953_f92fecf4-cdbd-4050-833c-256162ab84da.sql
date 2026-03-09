CREATE OR REPLACE FUNCTION public.fermate_con_linee(stop_ids text[])
RETURNS TABLE(stop_id text, route_short_name text, route_type integer) AS $$
  SELECT DISTINCT
    st.stop_id,
    r.route_short_name,
    r.route_type
  FROM stop_times_atm st
  JOIN trips_atm t ON st.trip_id = t.trip_id
  JOIN routes_atm r ON t.route_id = r.route_id
  WHERE st.stop_id = ANY(stop_ids)
  ORDER BY st.stop_id, r.route_short_name;
$$ LANGUAGE sql STABLE;