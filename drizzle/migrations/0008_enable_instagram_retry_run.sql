SELECT cron.schedule('social-publish-instagram-retry', '30 7 * * *', $$
select net.http_post(
  url:='https://www.milanohelp.it/api/public/hooks/social-publish',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select token from public.social_cron_token where id=1)),
  body:='{"soloInstagram":true}'::jsonb,
  timeout_milliseconds:=300000);
$$);