-- The superseded outbox index goes.
--
-- Pipeline fix review 1 finding 9.
--
-- `outbox_pending` (20260827000000_caleums_one_view_backend.sql:233) is
-- `(available_at, created_at) where state in ('pending','failed')`.
-- `outbox_claimable` (20260908143000_pipeline_sweeper_indexes.sql:25) is the
-- same two columns in the same order over a strictly wider predicate that adds
-- `dispatching`, so every query the old index could serve the new one serves as
-- well, on the same leading columns. Keeping both costs a second write on every
-- outbox insert and every state change, and gives the planner two
-- indistinguishable choices for the claim query.
--
-- Re-runnable: `drop index if exists`.

drop index if exists public.outbox_pending;
