
CREATE INDEX IF NOT EXISTS idx_stop_times_atm_stop_id_arrival ON stop_times_atm(stop_id, arrival_time);
CREATE INDEX IF NOT EXISTS idx_trips_atm_trip_id ON trips_atm(trip_id);
CREATE INDEX IF NOT EXISTS idx_trips_atm_route_id ON trips_atm(route_id);

CREATE OR REPLACE FUNCTION public.prossimi_arrivi(
  _stop_id text,
  _ora_corrente text DEFAULT '00:00'
)
RETURNS TABLE(
  route_short_name text,
  route_type integer,
  trip_headsign text,
  arrival_time text,
  trip_id text
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT 
    r.route_short_name,
    COALESCE(r.route_type, 3)::integer as route_type,
    COALESCE(t.trip_headsign, '') as trip_headsign,
    st.arrival_time,
    st.trip_id
  FROM stop_times_atm st
  JOIN trips_atm t ON t.trip_id = st.trip_id
  JOIN routes_atm r ON r.route_id = t.route_id
  WHERE st.stop_id = _stop_id
    AND st.arrival_time >= _ora_corrente
  ORDER BY r.route_short_name, t.trip_headsign, st.arrival_time
  LIMIT 200;
$$;
