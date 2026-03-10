CREATE OR REPLACE FUNCTION public.prossimi_arrivi_multi(_stop_ids text[], _ora_corrente text DEFAULT '00:00'::text)
 RETURNS TABLE(route_short_name text, route_type integer, trip_headsign text, arrival_time text, trip_id text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH ranked AS (
    SELECT 
      r.route_short_name,
      COALESCE(r.route_type, 3)::integer as route_type,
      COALESCE(t.trip_headsign, '') as trip_headsign,
      st.arrival_time,
      st.trip_id,
      ROW_NUMBER() OVER (
        PARTITION BY r.route_short_name, COALESCE(t.trip_headsign, '')
        ORDER BY st.arrival_time
      ) as rn
    FROM stop_times_atm st
    JOIN trips_atm t ON t.trip_id = st.trip_id
    JOIN routes_atm r ON r.route_id = t.route_id
    WHERE st.stop_id = ANY(_stop_ids)
      AND st.arrival_time >= _ora_corrente
  )
  SELECT ranked.route_short_name, ranked.route_type, ranked.trip_headsign, ranked.arrival_time, ranked.trip_id
  FROM ranked
  WHERE rn <= 10
  ORDER BY route_short_name, trip_headsign, arrival_time;
$function$