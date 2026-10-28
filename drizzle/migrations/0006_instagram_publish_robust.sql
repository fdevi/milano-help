ALTER TABLE public.eventi
  ADD COLUMN IF NOT EXISTS ig_creation_id text,
  ADD COLUMN IF NOT EXISTS ig_creation_at timestamptz,
  ADD COLUMN IF NOT EXISTS ig_posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS ig_giri integer NOT NULL DEFAULT 0;

ALTER TABLE public.social_post_logs
  ADD COLUMN IF NOT EXISTS creation_id text,
  ADD COLUMN IF NOT EXISTS tentativo integer,
  ADD COLUMN IF NOT EXISTS risposta jsonb;

-- Events already posted on Instagram successfully are marked as done.
UPDATE public.eventi e SET ig_posted_at = l.created_at
FROM public.social_post_logs l
WHERE l.evento_id = e.id AND l.piattaforma = 'instagram' AND l.esito = 'ok' AND e.ig_posted_at IS NULL;

-- Daily run (08:00 Rome) points at the production domain and may run up to 5 minutes.
SELECT cron.schedule('social-publish-daily', '0 7 * * *', $$
select net.http_post(
  url:='https://www.milanohelp.it/api/public/hooks/social-publish',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select token from public.social_cron_token where id=1)),
  body:='{}'::jsonb,
  timeout_milliseconds:=300000);
$$);

-- Recovery run (08:30 Rome): only retries Instagram posts still waiting, never picks new events.
SELECT cron.schedule('social-publish-instagram-retry', '30 7 * * *', $$
select net.http_post(
  url:='https://www.milanohelp.it/api/public/hooks/social-publish',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select token from public.social_cron_token where id=1)),
  body:='{"soloInstagram":true}'::jsonb,
  timeout_milliseconds:=300000);
$$);