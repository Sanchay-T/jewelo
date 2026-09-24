-- SP-2e2. The dependent views may carry their four authority sentences as
-- variables.
--
-- SP-2f1 lifted the four sentences that name the identity authority out of the
-- dependent still templates (on skin, close up, dark) and into the variables
-- `glyph_rule`, `bridge_rule`, `rings_rule` and `spelling_rule`
-- (`DEPENDENT_AUTHORITY_SENTENCES` in packages/ai/src/prompt-registry.ts). On
-- the stencil route they compile to today's exact text, byte for byte; on the
-- free route the same sentence points at @master, because no stencil is sent.
--
-- `create_prompt_release` still pinned the field-by-field family to the
-- fourteen specification fields plus `inspiration_rule` and `construction`, so
-- a dependent template carrying those four could not be published at all. They
-- are now allowed and never required: a release that does not carry them - such
-- as every release published before this migration - validates exactly as
-- before, and dropping a required field still fails publication. Nothing else
-- about the function changes; the minimal style-first branch is untouched.
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
    v_allowed:=v_required||array['construction','glyph_rule','bridge_rule','rings_rule','spelling_rule'];
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
