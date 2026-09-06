import { createHash } from 'node:crypto';

export const VERSION = 'jewelo-prompt-lab-1.0.0';
export const OPTIONS = Object.freeze({
  script: ['English', 'Arabic'],
  construction: ['Classical', 'Origami ribbon', 'Framed minimal', 'Diamond rails'],
  lettering: ['Classic', 'Minimal', 'Diwani', 'Kufi', 'Signature', 'Thuluth inspired'],
  layout: ['Side by side', 'Connected heart', 'Stacked', 'Infinity', 'Interlocked'],
  metal: ['Yellow gold', 'White gold', 'Rose gold'],
  coverage: ['No stones', 'Accent', 'Partial pavé', 'Full pavé'],
  gem: ['Lab diamond', 'Natural diamond', 'Ruby', 'Emerald', 'Blue sapphire', 'Pink sapphire'],
  size: [22, 32],
  chain: ['Cable', 'Rolo', 'Box', 'Curb'],
});
export const VIEWS = {
  Studio: {ratio: '1:1', text: 'Near-front catalog photograph on matte ivory. One large soft source with gentle fill and neutral white balance. Entire pendant and both attachment junctions visible, with sufficient depth of field to inspect the construction.'},
  'On skin': {ratio: '4:5', text: 'Jewelry-focused view at an adult wearer’s collarbone, natural skin texture and a plain neckline. The chain follows gravity and skin contours with plausible contact shadows. Keep the entire pendant and both attachment junctions visible and sharp; do not hide them behind clothing or hair.'},
  'Close-up': {ratio: '1:1', text: 'Close product photograph on neutral gray, pendant filling most of the frame. Resolve edge thickness, finish, settings and attachment junctions. Keep the complete pendant in frame and in focus; magnification must not crop away identity or hardware.'},
  Dark: {ratio: '9:16', text: 'Product photograph on matte charcoal with broad controlled highlights and subtle edge separation. Retain visible shadow detail, true metal color, the complete pendant and both attachments. Deep background, inspectable jewelry; no glow or theatrical sparkle.'},
};
export const CONSTRUCTIONS = {
  Classical: 'Upright shaped lettering forms the main rigid pendant body. Preserve approved structural bridges without changing linguistic spacing. No surrounding frame or extra backing plate.',
  'Framed minimal': 'An open rectangular frame supports upright lettering at the defined contact points. The frame carries the two attachment eyelets. No additional eyelets on the lettering.',
  'Diamond rails': 'Two parallel rails carry upright lettering through the defined rigid supports. The upper rail carries the two attachment eyelets. Rail architecture is retained even when No stones is selected; the family name does not independently request diamonds.',
  'Origami ribbon': 'Experimental folded-letter recipe: the lettering itself is a continuous metal ribbon with shallow alternating folded planes across broad strokes. Preserve readable glyph contours and connected metal through each crease. No separate folded carrier, cracks, cut letters or surrounding frame.',
};
export const LATIN = {
  Classic: 'Latin serif lettering with balanced proportions',
  Minimal: 'simple restrained Latin lettering with even strokes',
  Signature: 'connected Latin cursive with a handwritten rhythm',
  Diwani: 'Latin adaptation with flowing curved strokes and controlled swashes; retain English spelling',
  Kufi: 'Latin adaptation with angular rectilinear geometry; retain English spelling',
  'Thuluth inspired': 'Latin adaptation with tall upright proportions and contrasting curved strokes; retain English spelling',
};
export const ARRANGEMENTS = {
  'Side by side': 'Place both names upright side by side in the selected script reading order, joined by the approved structural connector.',
  'Connected heart': 'Place both upright names around a connected heart carrier; join each name to the carrier at its approved contacts.',
  Stacked: 'Place the first name above the second; both remain upright and independently readable. Use the approved inter-row supports, never rotate a horizontal word vertically.',
  Infinity: 'Support both upright names on the approved continuous infinity carrier without obscuring letters.',
  Interlocked: 'Preserve two distinct name-bearing rigid components and their approved mechanical interlock; do not fuse articulating parts or leave them unsupported.',
};
export const TEMPLATE = [
  'Create one photorealistic jewelry photograph.',
  '',
  'IDENTITY', '{{name_and_script}}', '{{lettering_and_arrangement}}',
  '', 'CONSTRUCTION', '{{construction_recipe}}', '{{attachment_recipe}}', '{{reference_roles}}',
  '', 'CUSTOMER SELECTIONS', '{{metal_and_finish}}', '{{stone_and_setting_spec}}',
  '{{selected_size}}', '{{chain_style}}', '{{applicable_personalization}}',
  '', 'PHOTOGRAPHY', '{{view_recipe}}',
  '', 'PRESERVE', '{{applicable_invariants}}',
].join('\n');
export const SLOTS = [...TEMPLATE.matchAll(/{{([a-z_]+)}}/g)].map(x => x[1]);
export const hash = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : stable(value)).digest('hex');
export function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function name(value, script) {
  if (typeof value !== 'string') throw Error('name_required');
  const s = value.normalize('NFC').trim();
  if (!s || [...s].length > 30 || !/^[\p{L}\p{M} '’\-]+$/u.test(s)) throw Error('invalid_name');
  const letters = [...s].filter(c => /\p{L}/u.test(c));
  const pattern = script === 'Arabic' ? /\p{Script=Arabic}/u : /\p{Script=Latin}/u;
  if (!letters.length || letters.some(c => !pattern.test(c))) throw Error('script_mismatch');
  return s;
}
export function normalize(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('configuration_required');
  const d = structuredClone(input);
  const allowed = new Set([...Object.keys(OPTIONS), 'name', 'secondName', 'twoNames', 'engraving', 'requests']);
  if (Object.keys(d).some(k => !allowed.has(k))) throw Error('unknown_configuration_field');
  if (typeof d.twoNames !== 'boolean') throw Error('twoNames_must_be_boolean');
  for (const [key, values] of Object.entries(OPTIONS)) {
    if (key === 'layout' && !d.twoNames) continue;
    if (key === 'gem' && d.coverage === 'No stones') continue;
    if (!values.includes(d[key])) throw Error('invalid_' + key);
  }
  d.name = name(d.name, d.script);
  if (d.twoNames) d.secondName = name(d.secondName, d.script);
  else { delete d.secondName; delete d.layout; }
  if (d.coverage === 'No stones') delete d.gem;
  d.engraving = (d.engraving ?? '').normalize('NFC').trim();
  if ([...d.engraving].length > 80 || /[{}<>@\n\r]/u.test(d.engraving)) throw Error('invalid_engraving');
  if (typeof d.requests !== 'undefined' && typeof d.requests !== 'string') throw Error('invalid_requests');
  if (d.requests?.trim()) throw Error('unresolved_optional_request: resolve into supported selections before compiling');
  delete d.requests;
  return freeze(d);
}
export function substitute(template, slots) {
  if (typeof template !== 'string' || template.length > 12000) throw Error('invalid_template');
  const matches = [...template.matchAll(/{{([a-z_]+)}}/g)];
  if (/[{}]/.test(template.replace(/{{[a-z_]+}}/g, ''))) throw Error('malformed_placeholder');
  for (const {1: key} of matches) {
    if (!SLOTS.includes(key)) throw Error('unknown_placeholder:' + key);
    if (typeof slots[key] !== 'string' || slots[key].length > 3000) throw Error('invalid_slot:' + key);
    if (/[{}]/.test(slots[key])) throw Error('placeholder_in_value');
  }
  for (const key of SLOTS) if (!matches.some(m => m[1] === key)) throw Error('missing_template_slot:' + key);
  const prompt = template.replace(/{{([a-z_]+)}}/g, (_, key) => slots[key]);
  if (prompt.length > 16000) throw Error('prompt_too_long');
  return prompt;
}
export function compile(input, {view = 'Studio', method = 'assembly', recipe, references = [], template = TEMPLATE} = {}) {
  const d = normalize(input);
  if (!VIEWS[view]) throw Error('unknown_view');
  if (!['text', 'body', 'assembly'].includes(method)) throw Error('unknown_method');
  if (!recipe || recipe.configHash !== hash(d)) throw Error('recipe_configuration_mismatch');
  if (recipe.status !== 'preflight_pass') throw Error('reference_preflight_required');
  if (!recipe.attachment || !recipe.invariants || !recipe.geometryHash) throw Error('incomplete_recipe');
  if (d.twoNames && !recipe.arrangement) throw Error('arrangement_recipe_required');
  if (d.engraving && recipe.engravingSurface !== 'rear') throw Error('approved_engraving_surface_required');
  if (d.coverage !== 'No stones' && (!recipe.stones?.length || !recipe.settingDescription)) throw Error('stone_map_required');
  const tag = method === 'body' ? 'geometry' : 'assembly';
  if (method === 'text' ? references.length !== 0 : references.length !== 1 || references[0].tag !== tag)
    throw Error('reference_role_mismatch');
  if (method !== 'text' && references[0].sha256 !== recipe[method + 'Hash']) throw Error('reference_hash_mismatch');
  const referenceRoles = method === 'text' ? '' : method === 'body'
    ? '@geometry defines the exact rigid body: glyph contours, supports and integral eyelets. Render this body with the specified separate connecting hardware and chain. Do not add or relocate body holes.'
    : '@assembly defines this exact body and its installed separate hardware. Preserve its glyph contours, support contacts, eyelets and interlocking relationships. Apply the requested finish and photographic presentation; do not redesign the assembly.';
  const stone = d.coverage === 'No stones' ? 'Stone-free metal. No gemstones, pavé, prongs, bezels or empty stone seats.'
    : d.coverage + ' with ' + d.gem + '. ' + recipe.settingDescription + ' Approved stone placement: ' + recipe.stones.map(s => s.id + ' at ' + s.location).join('; ') + '. Preserve this count and map; stones must not obscure the name.';
  const slots = {
    name_and_script: 'Exact pendant name' + (d.twoNames ? 's' : '') + ': ' + JSON.stringify(d.name) + (d.twoNames ? ' and ' + JSON.stringify(d.secondName) : '') + '. ' + d.script + ', ' + (d.script === 'Arabic' ? 'right-to-left' : 'left-to-right') + ' reading. This text forms the jewelry, not a caption.',
    lettering_and_arrangement: (d.script === 'English' ? LATIN[d.lettering] : d.lettering + ' Arabic lettering, preserving the approved shaped glyphs') + '. ' + (d.twoNames ? recipe.arrangement : 'One upright name; no second name or two-name connector.'),
    construction_recipe: CONSTRUCTIONS[d.construction] + ' ' + (recipe.constructionDetail || ''),
    attachment_recipe: recipe.attachment,
    reference_roles: referenceRoles,
    metal_and_finish: d.metal + ' appearance, clean polished finish. Coherent reflections, visible edge thickness and believable edge bevels. No assumed karat or invented material certificate.',
    stone_and_setting_spec: stone,
    selected_size: 'Nominal selected size label: ' + d.size + ' mm. Preserve the approved reference proportions. Do not print measurement labels or invent other dimensions.',
    chain_style: d.chain + ' chain: ' + ({Cable:'alternating oval links', Rolo:'rounded links', Box:'connected square box links', Curb:'flattened interlocking links lying in a coherent plane'}[d.chain]) + '. One necklace attached at its specified body attachment points.',
    applicable_personalization: d.engraving ? 'Rear-surface engraving only: ' + JSON.stringify(d.engraving) + '. The front view does not show this engraving; never transfer it onto the front.' : 'No additional personalization.',
    view_recipe: VIEWS[view].text,
    applicable_invariants: recipe.invariants + ' Preserve intentional letter counters, openwork and hardware apertures. All visible parts have plausible support. No loose chain ends beside an attachment, impossible intersections, extra holes, missing letters, captions, logos or sparkle graphics.',
  };
  const prompt = substitute(template, slots);
  return freeze({version: VERSION, config: d, configHash: hash(d), recipeHash: hash(recipe), templateHash: hash(template), view, method, model: 'gpt-image-2', ratio: VIEWS[view].ratio, quality: null, imageSize: null, referenceDescriptors: references, prompt, promptHash: hash(prompt), slots});
}
