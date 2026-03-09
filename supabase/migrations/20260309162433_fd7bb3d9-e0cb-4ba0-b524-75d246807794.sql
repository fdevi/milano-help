
-- Routes ATM table
CREATE TABLE IF NOT EXISTS public.routes_atm (
  route_id TEXT PRIMARY KEY,
  route_short_name TEXT,
  route_long_name TEXT,
  route_type INTEGER
);
ALTER TABLE public.routes_atm ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read routes_atm" ON public.routes_atm FOR SELECT TO public USING (true);

-- Trips ATM table
CREATE TABLE IF NOT EXISTS public.trips_atm (
  trip_id TEXT PRIMARY KEY,
  route_id TEXT REFERENCES public.routes_atm(route_id),
  direction_id INTEGER,
  trip_headsign TEXT
);
ALTER TABLE public.trips_atm ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read trips_atm" ON public.trips_atm FOR SELECT TO public USING (true);

-- Stop times ATM table (natural key: trip_id + stop_sequence)
CREATE TABLE IF NOT EXISTS public.stop_times_atm (
  trip_id TEXT NOT NULL REFERENCES public.trips_atm(trip_id),
  stop_id TEXT NOT NULL REFERENCES public.fermate_atm(stop_id),
  arrival_time TEXT,
  departure_time TEXT,
  stop_sequence INTEGER NOT NULL,
  PRIMARY KEY (trip_id, stop_sequence)
);
ALTER TABLE public.stop_times_atm ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read stop_times_atm" ON public.stop_times_atm FOR SELECT TO public USING (true);
