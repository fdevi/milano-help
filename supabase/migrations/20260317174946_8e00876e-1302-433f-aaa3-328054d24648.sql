DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'eventi') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.eventi;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'gruppi_messaggi') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gruppi_messaggi;
  END IF;
END $$;