-- The three index gaps the pipeline actually reads through.
--
-- Pipeline review 1 finding 9.
--
--   * `recover_stale_generation_tasks` scans `generation_tasks` on
--     `updated_at < $1 and status in (...)` every two minutes, with no index on
--     either column: a sequential scan of the whole table on every tick, which
--     grows with the shop's history rather than with the work in flight.
--   * `signedDependencyStillUrl` and the asset projections look assets up by
--     `task_id`, which only had the primary key on `id`.
--   * `outbox_pending` covers `state in ('pending','failed')` only, so the
--     lease-expiry sweep over `dispatching` rows fell back to
--     `outbox_dispatch_lease_expiry`, which is ordered by `locked_at` alone and
--     does not carry the dispatch order.
--
-- All three are plain `create index if not exists`, so re-running is free and
-- nothing about the read paths changes except how they are served.

create index if not exists generation_tasks_status_updated_at
  on public.generation_tasks(status, updated_at);

create index if not exists assets_task_id
  on public.assets(task_id);

create index if not exists outbox_claimable
  on public.outbox_events(available_at, created_at)
  where state in ('pending', 'failed', 'dispatching');
