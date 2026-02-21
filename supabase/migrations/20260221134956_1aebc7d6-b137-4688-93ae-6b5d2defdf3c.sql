-- Enable realtime for annunci and eventi tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.annunci;
ALTER PUBLICATION supabase_realtime ADD TABLE public.eventi;