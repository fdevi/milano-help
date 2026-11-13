-- Preserve the existing HTTP callback and its credentials. cron uses UTC;
-- the local-time guard handles both winter and summer time in Rome.
BEGIN;
DO $migration$
DECLARE
  approval_job record;
  callback text;
BEGIN
  SELECT jobid, command INTO STRICT approval_job
  FROM cron.job WHERE jobname = 'check-pending-approvals-job';

  callback := approval_job.command;
  IF callback NOT LIKE '%approval-rome-hours%' THEN
    callback := format(
      'DO $approval_rome_hours$ BEGIN /* approval-rome-hours */ IF (CURRENT_TIMESTAMP AT TIME ZONE ''Europe/Rome'')::time >= TIME ''06:00'' AND (CURRENT_TIMESTAMP AT TIME ZONE ''Europe/Rome'')::time < TIME ''24:00'' THEN %s END IF; END; $approval_rome_hours$;',
      regexp_replace(rtrim(callback), ';\s*$', '') || ';'
    );
  END IF;

  PERFORM cron.alter_job(approval_job.jobid, schedule := '0,30 4-23 * * *', command := callback);
END;
$migration$;

UPDATE public.notifiche_approvazione
SET frequenza = '30m', updated_at = now()
WHERE id = 1;
COMMIT;