
CREATE TABLE public.notifiche_approvazione (
  id integer PRIMARY KEY DEFAULT 1,
  attivo boolean NOT NULL DEFAULT false,
  frequenza text NOT NULL DEFAULT '30m',
  ultimo_invio timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifiche_approvazione ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read notifiche_approvazione" ON public.notifiche_approvazione
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update notifiche_approvazione" ON public.notifiche_approvazione
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can insert notifiche_approvazione" ON public.notifiche_approvazione
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.notifiche_approvazione (id, attivo, frequenza)
VALUES (1, false, '30m')
ON CONFLICT (id) DO NOTHING;
