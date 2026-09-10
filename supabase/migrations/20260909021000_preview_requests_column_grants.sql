-- Security review 2 M-1. The shop tablet's anonymous JWT could read every
-- column of its own preview requests, including `contact`, `operator_note` and
-- `notified_at`: `20260907010000_preview_requests.sql` granted `select` on the
-- whole table to `authenticated`, and row level security bounds which rows are
-- visible, never which columns. The route layer already answers customers with
-- `CUSTOMER_COLUMNS` (`apps/web/src/lib/backend/preview-requests.ts`), so a
-- direct PostgREST call was the only way to see more than the route publishes.
--
-- The grant is now that same list and nothing else. `operator_note` is an
-- operator's private words about a customer, `contact` is what the operator
-- needs and the browser already sent, and `notified_at` is the notification
-- job's claim: none of the three belongs to the tablet. `insert` stays a table
-- grant, because the capture writes `principal_id`, `contact` and
-- `request_key`, and `service_role` keeps every privilege for the operator
-- routes and the job.

revoke select on table public.preview_requests from authenticated;
grant select (
  id,
  status,
  locale,
  specification,
  sample_reference,
  design_id,
  design_revision_id,
  generation_run_id,
  created_at,
  updated_at,
  contacted_at
) on table public.preview_requests to authenticated;
