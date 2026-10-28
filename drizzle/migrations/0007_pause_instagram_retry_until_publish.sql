-- The live site still runs the old code, which would treat the recovery call as a full run. Re-enabled after publishing.
SELECT cron.unschedule('social-publish-instagram-retry');