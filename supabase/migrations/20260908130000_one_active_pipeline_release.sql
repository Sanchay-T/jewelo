-- Adversarial finding 7. Exactly one pipeline release may be active.
--
-- `expand_final_media_run` reads the active release with
-- `order by created_at desc limit 1`, so two rows with `status='active'` would
-- pin runs to whichever row happened to sort first: two customers could get
-- media from two different identity engines with nothing in the record saying
-- why. The registry is the pin, so the registry enforces the pin.
--
-- Additive and re-runnable: a partial unique index only, no data change. It
-- succeeds today because `20260908120000_pipeline_release_v2.sql` flipped
-- `caleums-final-media-v1` to `legacy` in the same transaction that inserted
-- `caleums-final-media-v2`, leaving one active row. A future bump has to do
-- the same, which is the point.

create unique index if not exists pipeline_releases_one_active
  on public.pipeline_releases (status)
  where status = 'active';
