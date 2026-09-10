-- Fix review 3 BL-1. `20260909021000_preview_requests_column_grants.sql`
-- narrowed the tablet's `select` to the customer columns and left out
-- `request_key`. The capture route replays through
-- `?request_key=eq.<uuid>` under the shopper's own bearer, and Postgres needs
-- `select` on every column a `where` clause names, so every capture answered
-- `permission denied for table preview_requests`, replay or not.
--
-- `request_key` is a client-generated uuid with nothing personal in it, and
-- row level security still bounds which rows carry it, so granting it back
-- restores the capture path without reopening M-1.

grant select (request_key) on table public.preview_requests to authenticated;
