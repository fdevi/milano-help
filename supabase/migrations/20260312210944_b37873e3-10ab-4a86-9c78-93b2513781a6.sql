
CREATE TABLE public.importazioni_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  fonte text NOT NULL,
  eventi_trovati integer NOT NULL DEFAULT 0,
  eventi_inseriti integer NOT NULL DEFAULT 0,
  eventi_scartati integer NOT NULL DEFAULT 0,
  dettaglio jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.importazioni_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read importazioni_log" ON public.importazioni_log
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert importazioni_log" ON public.importazioni_log
  FOR INSERT WITH CHECK (true);
