-- The development project has a pre-existing event-trigger helper in the
-- exposed public schema. Event triggers execute it as the database owner; API
-- roles never need direct RPC access.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public';
    execute 'revoke execute on function public.rls_auto_enable() from anon, authenticated';
  end if;
end;
$$;
