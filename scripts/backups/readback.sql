-- Proof that a restored dump is the database the app reads.
--
-- Part 1 is the row-count table. Part 2 mirrors, in SQL, exactly what
-- apps/web/src/app/api/state/route.ts asks PostgREST for when a shopper's
-- browser polls /api/state?designId=<id>: the same ten tables, the same
-- design scoping, the same column projections. If this answers, the restored
-- database can serve that route.
--
-- :design_id may be empty; the newest design is used then.
\set ON_ERROR_STOP on
\pset pager off

\echo '--- row counts ---'
select 'designs' as table_name, count(*) as rows from public.designs
union all select 'generation_runs', count(*) from public.generation_runs
union all select 'generation_tasks', count(*) from public.generation_tasks
union all select 'preview_requests', count(*) from public.preview_requests
union all select 'identity_artifacts', count(*) from public.identity_artifacts
union all select 'assets', count(*) from public.assets
union all select 'audit_events', count(*) from public.audit_events
order by table_name;

\echo '--- schema shape /api/state depends on ---'
select count(*) as state_columns_present
from information_schema.columns
where (table_schema, table_name, column_name) in (
  ('public','generation_tasks','presentation_view'),
  ('public','generation_tasks','terminal_error_code'),
  ('public','generation_tasks','prompt_release'),
  ('public','assets','verification_result'),
  ('public','assets','object_path'),
  ('public','assets','bucket_id'),
  ('public','audit_events','design_id')
);

\echo '--- /api/state?designId= mirror ---'
select coalesce(nullif(:'design_id', ''), (select id::text from public.designs order by created_at desc limit 1)) as design_id
\gset

\echo 'design id:' :design_id

with d as (select * from public.designs where id = :'design_id'::uuid),
     runs as (select * from public.generation_runs where design_id = :'design_id'::uuid)
select
  (select count(*) from d)                                              as designs,
  (select count(*) from public.design_drafts where design_id = :'design_id'::uuid)    as design_drafts,
  (select count(*) from public.design_revisions where design_id = :'design_id'::uuid) as design_revisions,
  (select count(*) from runs)                                           as generation_runs,
  (select count(*) from public.generation_tasks t where t.run_id in (select id from runs)) as generation_tasks,
  (select count(*) from public.assets where design_id = :'design_id'::uuid)           as assets,
  (select count(*) from public.price_snapshots)                         as price_snapshots_all,
  (select count(*) from public.quotes where design_id = :'design_id'::uuid)           as quotes,
  (select count(*) from public.orders where design_id = :'design_id'::uuid)           as orders,
  (select count(*) from public.audit_events where design_id = :'design_id'::uuid)     as audit_events;

\echo '--- the design row the atelier renders ---'
select id, status, created_at
from public.designs where id = :'design_id'::uuid;

\echo '--- its stills, as /api/state projects them before signing ---'
select a.presentation_view,
       a.provider,
       a.model,
       a.mime_type,
       (a.verification_result ->> 'passed') as verification_passed,
       (a.object_path is not null)          as has_object_path
from public.assets a
where a.design_id = :'design_id'::uuid
order by a.presentation_view;
