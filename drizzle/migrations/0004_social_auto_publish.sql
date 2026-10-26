ALTER TABLE public.eventi ADD COLUMN IF NOT EXISTS social_posted_at timestamptz;

CREATE TABLE public.social_post_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid,
  piattaforma text NOT NULL,
  esito text NOT NULL,
  dettaglio text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.social_post_logs TO authenticated;
GRANT ALL ON public.social_post_logs TO service_role;
ALTER TABLE public.social_post_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read social logs" ON public.social_post_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.social_cron_token (
  id integer PRIMARY KEY DEFAULT 1,
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex')
);
GRANT ALL ON public.social_cron_token TO service_role;
ALTER TABLE public.social_cron_token ENABLE ROW LEVEL SECURITY;
INSERT INTO public.social_cron_token (id) VALUES (1);