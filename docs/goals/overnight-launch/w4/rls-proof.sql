\set ON_ERROR_STOP on
begin;
set local lock_timeout = '3s';
set local statement_timeout = '60s';

\i supabase/migrations/20260907010000_preview_requests.sql

insert into auth.users(instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'proof-a@rls.test', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'proof-b@rls.test', now(), now());

-- A design that belongs to B only, used for the cross-tenant link check.
insert into public.designs(id, owner_principal_id, customer_id, locale)
values ('dddddddd-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', 'en');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare v_id uuid;
begin
  insert into public.preview_requests(principal_id, locale, specification, contact, request_key)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 'ar', '{"names":["ليلى"]}', '{"channel":"whatsapp","value":"+971501234567"}', 'k1')
    returning id into v_id;
  raise notice 'PASS  A inserts own row';
exception when others then raise notice 'FAIL  A inserts own row: %', sqlerrm;
end $$;

do $$
begin
  insert into public.preview_requests(principal_id, locale, specification, contact)
    values ('bbbbbbbb-0000-4000-8000-000000000002', 'ar', '{}', '{"channel":"email","value":"b@rls.test"}');
  raise notice 'FAIL  A forged a row owned by B';
exception when others then raise notice 'PASS  A cannot forge B''s row (%)', sqlerrm;
end $$;

do $$
begin
  insert into public.preview_requests(principal_id, locale, specification, contact, request_key)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 'ar', '{"names":["ليلى"]}', '{"channel":"whatsapp","value":"+971501234567"}', 'k1');
  raise notice 'FAIL  duplicate request_key accepted';
exception when unique_violation then raise notice 'PASS  duplicate request_key rejected (23505)';
  when others then raise notice 'FAIL  duplicate request_key: %', sqlerrm;
end $$;

do $$
begin
  insert into public.preview_requests(principal_id, locale, specification, contact, design_id)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 'ar', '{}', '{"channel":"email","value":"a@rls.test"}',
            'dddddddd-0000-4000-8000-000000000003');
  raise notice 'FAIL  linked another principal''s design';
exception when others then raise notice 'PASS  cross-tenant design link rejected (%)', sqlerrm;
end $$;

do $$
declare v_count integer;
begin
  select count(*) into v_count from public.preview_requests;
  raise notice '%  A reads own rows: %', case when v_count = 1 then 'PASS' else 'FAIL' end, v_count;
end $$;

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $$
declare v_count integer;
begin
  select count(*) into v_count from public.preview_requests;
  raise notice '%  B reads no rows of A: %', case when v_count = 0 then 'PASS' else 'FAIL' end, v_count;
end $$;

do $$
begin
  update public.preview_requests set status = 'fulfilled';
  raise notice 'FAIL  client update accepted';
exception when others then raise notice 'PASS  client update rejected (%)', sqlerrm;
end $$;

do $$
begin
  delete from public.preview_requests;
  raise notice 'FAIL  client delete accepted';
exception when others then raise notice 'PASS  client delete rejected (%)', sqlerrm;
end $$;

reset role;

do $$
declare v_count integer; v_detail jsonb;
begin
  select count(*) into v_count from public.audit_events where action = 'preview_request.captured';
  select detail into v_detail from public.audit_events where action = 'preview_request.captured' limit 1;
  raise notice '%  audit row appended on insert: % %', case when v_count = 1 then 'PASS' else 'FAIL' end, v_count, v_detail;
  raise notice '%  audit detail carries no contact value', case when v_detail::text not like '%971501234567%' then 'PASS' else 'FAIL' end;
end $$;

do $$
declare v_status text; v_when timestamptz; v_count integer;
begin
  update public.preview_requests set status = 'contacted', contacted_at = now(), operator_note = 'called'
    where status = 'new';
  select status, contacted_at into v_status, v_when from public.preview_requests limit 1;
  select count(*) into v_count from public.audit_events where action = 'preview_request.status_changed';
  raise notice '%  service role marks contacted: % %', case when v_status = 'contacted' and v_when is not null then 'PASS' else 'FAIL' end, v_status, v_when;
  raise notice '%  status change audited: %', case when v_count = 1 then 'PASS' else 'FAIL' end, v_count;
end $$;

do $$
begin
  update public.preview_requests set status = 'new', contacted_at = now();
  raise notice 'FAIL  contacted_at survived a return to new';
exception when check_violation then raise notice 'PASS  contacted_at/state check holds';
  when others then raise notice 'PASS  contacted_at/state rejected (%)', sqlerrm;
end $$;

rollback;
