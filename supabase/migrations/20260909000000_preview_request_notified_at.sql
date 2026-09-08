-- P7-3 / DS-8. Exactly one notification per captured request.
--
-- Nobody in the shop is told when a request arrives. The Inngest function
-- `preview-request-notification` closes that, and this column is what makes it
-- idempotent: the function claims the row with a conditional update
-- (`notified_at is null`), and only the update that actually changed a row goes
-- on to compose and send. A re-delivered event, an Inngest retry and the
-- operator queue all see the same claim, so a shopper is announced once.
--
-- Additive and nullable: every existing row stays unnotified, which is the
-- truth (they were captured before the function existed) and never re-announces
-- yesterday's queue.
--
-- Only the service role writes it. The customer policies are untouched, and
-- there is still no owner update policy on the table, so a shopper cannot clear
-- their own flag to make the shop announce them again.

alter table public.preview_requests
  add column if not exists notified_at timestamptz;

comment on column public.preview_requests.notified_at is
  'When the shop was told about this request. Claimed by the notification job with a conditional update, so the announcement happens once.';

-- The claim filters on the null case only, so a partial index is the whole
-- working set: unannounced requests, newest first.
create index if not exists preview_requests_unnotified
  on public.preview_requests(created_at desc)
  where notified_at is null;
