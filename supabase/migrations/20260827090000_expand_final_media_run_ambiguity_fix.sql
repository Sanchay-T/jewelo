do $$
declare
  v_signature regprocedure := to_regprocedure('public.expand_final_media_run(uuid)');
  v_definition text;
begin
  if v_signature is null then
    return;
  end if;

  select pg_get_functiondef(v_signature) into v_definition;
  if position('#variable_conflict use_column' in v_definition) > 0 then
    return;
  end if;

  v_definition := regexp_replace(
    v_definition,
    E'AS \\$function\\$\\s*declare',
    E'AS $function$\n#variable_conflict use_column\ndeclare',
    'n'
  );

  if position('#variable_conflict use_column' in v_definition) = 0 then
    raise exception 'expand_final_media_run function shape was not recognized';
  end if;

  execute v_definition;
end $$;
