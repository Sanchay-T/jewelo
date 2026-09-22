-- The minimal style-first still sheet may be published.
--
-- `create_prompt_release` pinned one variable set: the fourteen immutable
-- specification fields plus `inspiration_rule`, and (since
-- 20260909020000) `construction`. The prompt family measured on
-- gpt-image-2.5-sunburst on 22 September 2026
-- (docs/goals/road-to-gold/lab-2026-09-22/) is a short style-first sheet that
-- passed for all four constructions at about 40% of the old length: it names
-- the name, the construction and the stones as three composed sentences
-- (`name_spelling`, `construction`, `stones_rule`) and the few fields it still
-- prints literally, and it deliberately says nothing else.
--
-- So a release is now valid if it is either the field-by-field family, exactly
-- as before, or the minimal family: it carries `name_spelling`, and then it
-- must also carry `construction` and `stones_rule` and may carry only the
-- fields the sheet prints. Every release published before this migration still
-- validates unchanged, and dropping a field from a field-by-field release still
-- fails publication. The same rule is `MINIMAL_STILL_REQUIRED_VARIABLES` in
-- packages/ai/src/prompt-registry.ts.
create or replace function public.create_prompt_release(p_profile text,p_template text,p_parsed_variables text[],p_change_note text,p_created_by text)
returns public.prompt_releases language plpgsql security definer set search_path='' as $$
declare v_release public.prompt_releases; v_version integer; v_required text[]; v_allowed text[];
begin
  if p_profile not in ('image.studio','image.packshot','image.worn','image.macro_gift','image.dark_editorial','image.studio_hero','image.billboard','video.preview','video.final','verification.image') then raise exception 'invalid prompt profile'; end if;
  if length(trim(p_template))=0 or length(p_template)>12000 then raise exception 'invalid prompt template length'; end if;
  if length(trim(p_change_note))=0 or length(p_change_note)>500 then raise exception 'invalid change note'; end if;
  if length(trim(p_created_by))=0 then raise exception 'invalid prompt actor'; end if;
  if p_parsed_variables is null then raise exception 'invalid prompt variables'; end if;
  if p_parsed_variables @> array['name_spelling'] then
    -- The minimal style-first sheet.
    v_required:=array['name_spelling','construction','stones_rule'];
    v_allowed:=v_required||array['approved_name','language','arabic_style','layout','metal_karat','metal_color','finish','stone_coverage','gemstone','size_profile','dimensions','chain_style','chain_length','presentation_view','inspiration_rule'];
  else
    v_required:=array['approved_name','language','arabic_style','layout','metal_karat','metal_color','finish','stone_coverage','gemstone','size_profile','dimensions','chain_style','chain_length','presentation_view'];
    if p_profile<>'image.studio' then v_required:=v_required||array['inspiration_rule']; end if;
    v_allowed:=v_required||array['construction'];
  end if;
  if not (p_parsed_variables @> v_required) or not (p_parsed_variables <@ v_allowed) or cardinality(p_parsed_variables)<>cardinality(array(select distinct unnest(p_parsed_variables))) then raise exception 'invalid prompt variables'; end if;
  perform pg_advisory_xact_lock(hashtextextended('prompt-release:'||p_profile,0));
  select coalesce(max(version),0)+1 into v_version from public.prompt_releases where profile=p_profile;
  insert into public.prompt_releases(profile,version,template,parsed_variables,change_note,created_by) values(p_profile,v_version,p_template,p_parsed_variables,p_change_note,p_created_by) returning * into v_release;
  insert into public.audit_events(actor_type,action,detail) values('operator','prompt.release_created',jsonb_build_object('profile',p_profile,'releaseId',v_release.id,'version',v_version));
  return v_release;
end $$;

revoke all on function public.create_prompt_release(text,text,text[],text,text) from public,anon,authenticated;
grant execute on function public.create_prompt_release(text,text,text[],text,text) to service_role;
