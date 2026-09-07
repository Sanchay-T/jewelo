-- Restore the ZIP-faithful prompts from caleums_pipeline_final.zip
-- (`prompt_builder_v5_production.py`, validated 2026-08-27).
--
-- The v1 releases were a compressed paraphrase that dropped ~600-760 characters
-- per shot, including the entire 517-character role-separation block that the
-- ZIP had explicitly certified against letterform contamination. The worn shot,
-- which lost the most, produced visible letterform drift in real generations.
--
-- What changes:
--   * every image profile gets the ZIP's scene + role separation + piece spec
--     + hero + guards, byte-faithful apart from rewriting the Runway tags
--     `@pendantshape`/`@style` as "the first/second supplied image", which is
--     what OpenAI's untagged images/edits array actually gives the model;
--   * the customer name, script and lettering style leave the prompt entirely
--     - geometry travels as pixels in the silhouette reference, never in words;
--   * `piece_spec` is one composed jeweller clause, so "none" stones emit no
--     text at all instead of the literal "none none" the v1 releases produced;
--   * `drape` is voiced only in the worn shot, per chain length.
--
-- Publication affects only new tasks. Existing snapshots stay pinned to v1.

-- The prompt variable vocabulary changes shape, so the release validator and
-- its required-variable contract move with it.
create or replace function public.create_prompt_release(p_profile text,p_template text,p_parsed_variables text[],p_change_note text,p_created_by text)
returns public.prompt_releases language plpgsql security definer set search_path='' as $$
declare v_release public.prompt_releases; v_version integer; v_required text[];
begin
  if p_profile not in ('image.studio','image.packshot','image.worn','image.macro_gift','image.dark_editorial','image.studio_hero','image.billboard','video.preview','video.final') then raise exception 'invalid prompt profile'; end if;
  if length(trim(p_template))=0 or length(p_template)>12000 then raise exception 'invalid prompt template length'; end if;
  if length(trim(p_change_note))=0 or length(p_change_note)>500 then raise exception 'invalid change note'; end if;
  if p_profile='image.studio' then
    v_required:=array['approved_name','language','arabic_style','layout','metal_karat','metal_color','finish','stone_coverage','gemstone','size_profile','dimensions','chain_style','chain_length','presentation_view'];
  elsif p_profile='image.worn' then
    v_required:=array['piece_spec','drape'];
  else
    v_required:=array['piece_spec'];
  end if;
  if p_parsed_variables is null or not (p_parsed_variables @> v_required and p_parsed_variables <@ v_required) or cardinality(p_parsed_variables)<>cardinality(array(select distinct unnest(p_parsed_variables))) then raise exception 'invalid prompt variables'; end if;
  perform pg_advisory_xact_lock(hashtextextended('prompt-release:'||p_profile,0));
  select coalesce(max(version),0)+1 into v_version from public.prompt_releases where profile=p_profile;
  insert into public.prompt_releases(profile,version,template,parsed_variables,change_note,created_by) values(p_profile,v_version,p_template,p_parsed_variables,p_change_note,p_created_by) returning * into v_release;
  insert into public.audit_events(actor_type,action,detail) values('operator','prompt.release_created',jsonb_build_object('profile',p_profile,'releaseId',v_release.id,'version',v_version));
  return v_release;
end $$;
revoke all on function public.create_prompt_release(text,text,text[],text,text) from public,anon,authenticated;

insert into public.prompt_releases(profile,version,template,parsed_variables,change_note,created_by) values
  ('image.packshot',2,'Catalogue photograph of the full necklace against a neutral ivory cream background, both sides of the chain falling from the top of the frame down to the pendant, the two sides hanging with slightly different curves, a soft visible shadow pooling beneath the pendant. The first supplied image is the ONE AND ONLY source for the pendant: the pendant is EXACTLY the black shape shown in it - every stroke, curve and the small fused dots are one solid manufactured piece, present exactly as drawn, the two small hollow rings at the top are the jump rings; do not add, remove, separate or redraw anything. The second supplied image is a style reference ONLY: match its framing, light, colour palette, setting and overall mood, but never copy the pendant, the name, the letterforms or any object from it. {{piece_spec}}The pendant is the hero of the image - the sharpest, most eye-catching element in the frame, nothing competing with it. Real unretouched photograph, faint grain, not a 3D render, no artificial glow. The chain threads INTO both jump rings with no gap. No text, no logos, no watermarks.',array['piece_spec'],'ZIP-faithful caleums v5 production template','system:migration'),
  ('image.worn',2,'A woman wearing the necklace, photographed for a jewellery brand, the pendant resting {{drape}}, its chain draping naturally and slightly unevenly, casting a thin soft shadow on skin and fabric, natural skin texture. The first supplied image is the ONE AND ONLY source for the pendant: the pendant is EXACTLY the black shape shown in it - every stroke, curve and the small fused dots are one solid manufactured piece, present exactly as drawn, the two small hollow rings at the top are the jump rings; do not add, remove, separate or redraw anything. The second supplied image is a style reference ONLY: match its framing, light, colour palette, setting and overall mood, but never copy the pendant, the name, the letterforms or any object from it. {{piece_spec}}The pendant is the hero of the image - the sharpest, most eye-catching element in the frame, nothing competing with it. Real unretouched photograph, faint grain, not a 3D render, no artificial glow. The chain threads INTO both jump rings with no gap. No text, no logos, no watermarks.',array['piece_spec','drape'],'ZIP-faithful caleums v5 production template','system:migration'),
  ('image.macro_gift',2,'Macro product photograph of the necklace laid on a roll of black suede, the chain snaking across the dark textured fabric in a loose natural curve, suede nap and tiny fibre specks resolved near the pendant, deep soft shadow at the edges, shallow depth of field. The first supplied image is the ONE AND ONLY source for the pendant: the pendant is EXACTLY the black shape shown in it - every stroke, curve and the small fused dots are one solid manufactured piece, present exactly as drawn, the two small hollow rings at the top are the jump rings; do not add, remove, separate or redraw anything. The second supplied image is a style reference ONLY: match its framing, light, colour palette, setting and overall mood, but never copy the pendant, the name, the letterforms or any object from it. {{piece_spec}}The pendant is the hero of the image - the sharpest, most eye-catching element in the frame, nothing competing with it. Real unretouched photograph, faint grain, not a 3D render, no artificial glow. The chain threads INTO both jump rings with no gap. No text, no logos, no watermarks.',array['piece_spec'],'ZIP-faithful caleums v5 production template','system:migration'),
  ('image.dark_editorial',2,'Elegant editorial photograph framed on the neck and collarbone of a woman in a midnight-blue satin dress with a modest neckline against a near-black background, one warm directional spotlight on the necklace, everything else in deep soft shadow, natural skin texture. The first supplied image is the ONE AND ONLY source for the pendant: the pendant is EXACTLY the black shape shown in it - every stroke, curve and the small fused dots are one solid manufactured piece, present exactly as drawn, the two small hollow rings at the top are the jump rings; do not add, remove, separate or redraw anything. The second supplied image is a style reference ONLY: match its framing, light, colour palette, setting and overall mood, but never copy the pendant, the name, the letterforms or any object from it. {{piece_spec}}The pendant is the hero of the image - the sharpest, most eye-catching element in the frame, nothing competing with it. Real unretouched photograph, faint grain, not a 3D render, no artificial glow. The chain threads INTO both jump rings with no gap. No text, no logos, no watermarks.',array['piece_spec'],'ZIP-faithful caleums v5 production template','system:migration'),
  ('image.studio_hero',2,'Studio photograph of the necklace hanging in front of a warm ivory-grey seamless paper sweep lit by a single softbox from the upper left with a white bounce card right, asymmetric falloff on the sweep, no radial halo, no props, chain hanging with slightly uneven drape, a soft accurate shadow behind. The first supplied image is the ONE AND ONLY source for the pendant: the pendant is EXACTLY the black shape shown in it - every stroke, curve and the small fused dots are one solid manufactured piece, present exactly as drawn, the two small hollow rings at the top are the jump rings; do not add, remove, separate or redraw anything. The second supplied image is a style reference ONLY: match its framing, light, colour palette, setting and overall mood, but never copy the pendant, the name, the letterforms or any object from it. {{piece_spec}}The pendant is the hero of the image - the sharpest, most eye-catching element in the frame, nothing competing with it. Real unretouched photograph, faint grain, not a 3D render, no artificial glow. The chain threads INTO both jump rings with no gap. No text, no logos, no watermarks.',array['piece_spec'],'ZIP-faithful caleums v5 production template','system:migration'),
  ('image.billboard',2,'Campaign photograph of the necklace hanging toward the right of the frame against a matte black paper sweep lit by one narrow warm spotlight from above, the metal glowing with a subtle rim light, calm empty darkness across the left of the frame, nothing else in frame. The first supplied image is the ONE AND ONLY source for the pendant: the pendant is EXACTLY the black shape shown in it - every stroke, curve and the small fused dots are one solid manufactured piece, present exactly as drawn, the two small hollow rings at the top are the jump rings; do not add, remove, separate or redraw anything. The second supplied image is a style reference ONLY: match its framing, light, colour palette, setting and overall mood, but never copy the pendant, the name, the letterforms or any object from it. {{piece_spec}}The pendant is the hero of the image - the sharpest, most eye-catching element in the frame, nothing competing with it. Real unretouched photograph, faint grain, not a 3D render, no artificial glow. The chain threads INTO both jump rings with no gap. No text, no logos, no watermarks.',array['piece_spec'],'ZIP-faithful caleums v5 production template','system:migration')
on conflict (profile,version) do nothing;

-- Point each published profile at its v2 release. Only new tasks are affected.
update public.prompt_profile_publications p
set release_id = r.id, published_by = 'system:migration', published_at = now()
from public.prompt_releases r
where r.profile = p.profile and r.version = 2
  and p.profile in ('image.packshot','image.worn','image.macro_gift','image.dark_editorial','image.studio_hero','image.billboard');

-- Motion prompts share the same variable vocabulary, so their published
-- releases move with it or every video task would fail to compile.
insert into public.prompt_releases(profile,version,template,parsed_variables,change_note,created_by) values
  ('video.preview',3,'Create a restrained silent motion preview from the approved still. {{piece_spec}} Keep the pendant geometry, spelling and attachments unchanged in every frame. Use only subtle product-camera movement and controlled specular light; no morphing, no new objects, no text.',array['piece_spec'],'Align motion prompts with the ZIP-faithful piece_spec vocabulary','system:migration'),
  ('video.final',3,'Create a polished silent final product film from the approved still. {{piece_spec}} Keep the pendant geometry, spelling and attachments stable for the full shot. Use elegant restrained camera motion and realistic light only; do not morph the pendant or introduce unapproved details.',array['piece_spec'],'Align motion prompts with the ZIP-faithful piece_spec vocabulary','system:migration')
on conflict (profile,version) do nothing;

update public.prompt_profile_publications p
set release_id = r.id, published_by = 'system:migration', published_at = now()
from public.prompt_releases r
where r.profile = p.profile and r.version = 3
  and p.profile in ('video.preview','video.final');
