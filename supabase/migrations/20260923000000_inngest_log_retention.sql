-- Keep the self-hosted Inngest run logs to the last 24 hours.
--
-- Inngest writes its dashboard traces into this database (about 27,000 span
-- rows a day). On 23 Sep 2026 they reached 1.5 GB of a 500 MB plan, Supabase
-- switched the database to read-only, and every new shopper failed at the
-- anonymous sign-in, so no piece could be photographed. The tables below are
-- dashboard history only; run state lives elsewhere, and the shop's own rows
-- are untouched.
create extension if not exists pg_cron;

select cron.unschedule(jobid) from cron.job where jobname = 'inngest-log-retention';

select cron.schedule(
  'inngest-log-retention',
  '17 * * * *',
  $$
  delete from inngest.spans where start_time < now() - interval '1 day';
  delete from inngest.traces where "timestamp" < (now() at time zone 'utc') - interval '1 day';
  delete from inngest.trace_runs where queued_at < (extract(epoch from now()) * 1000 - 86400000);
  delete from inngest.history where created_at < (now() at time zone 'utc') - interval '1 day';
  $$
);
