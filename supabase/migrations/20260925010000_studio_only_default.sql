-- SIMPLE-1b: studio-only is the product's shape, not a live row somebody set.
--
-- `20260909010000_runtime_policy_studio_only.sql` added
-- `runtime_policy.studio_only` defaulting to false, and SIMPLE-1 set the live
-- row to true so a run reserves and bills one photograph. Any fresh database -
-- a rebuild, a new environment, a restored branch - would come up with the
-- column false again and expand every run to four tasks, three of which the
-- job now stops at `studio_view_only` after they have already reserved money.
--
-- The default is flipped so a new deployment starts studio-only, and the
-- existing row is set true so an environment created before this migration
-- matches. Re-runnable: both statements are idempotent.

alter table public.runtime_policy
  alter column studio_only set default true;

update public.runtime_policy set studio_only = true;

comment on column public.runtime_policy.studio_only is
  'When true (the default since SIMPLE-1b), expand_final_media_run creates the three dependent views cancelled with terminal_error_code studio_only_policy and books no reservation for them, so a run bills one image.';
