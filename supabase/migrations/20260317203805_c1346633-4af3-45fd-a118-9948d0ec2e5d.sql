DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifiche') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifiche;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'conversazioni_private') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversazioni_private;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messaggi_privati') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messaggi_privati;
  END IF;
END $$;