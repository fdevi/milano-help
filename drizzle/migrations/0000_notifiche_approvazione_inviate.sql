CREATE TABLE public.notifiche_approvazione_inviate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elemento_id uuid NOT NULL,
  tipo text NOT NULL,
  inviata_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (elemento_id, tipo)
);
GRANT ALL ON public.notifiche_approvazione_inviate TO service_role;
ALTER TABLE public.notifiche_approvazione_inviate ENABLE ROW LEVEL SECURITY;
INSERT INTO public.notifiche_approvazione_inviate (elemento_id, tipo)
SELECT id, 'annuncio' FROM public.annunci WHERE stato = 'in_moderazione'
UNION ALL
SELECT id, 'evento' FROM public.eventi WHERE stato = 'in_moderazione'
ON CONFLICT DO NOTHING;