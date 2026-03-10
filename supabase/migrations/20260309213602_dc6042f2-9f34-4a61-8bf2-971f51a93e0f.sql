CREATE INDEX IF NOT EXISTS idx_stop_times_atm_stop_id ON public.stop_times_atm (stop_id);
CREATE INDEX IF NOT EXISTS idx_stop_times_atm_trip_id ON public.stop_times_atm (trip_id);