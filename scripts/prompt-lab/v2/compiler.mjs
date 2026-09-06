import { normalize, hash, stable, VIEWS } from '../compiler.mjs';

export { normalize, hash, stable, VIEWS };
export const VERSION = 'jewelo-creative-prompt-lab-2.0.0';

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export const METHODS = freeze(['text', 'style', 'style_hardware', 'style_hardware_spelling']);
const ROLES = freeze({text: [], style: ['lettering'], style_hardware: ['lettering', 'hardware'], style_hardware_spelling: ['lettering', 'hardware', 'spelling']});
export const STYLE_TRAITS = freeze({
  Arabic: {font: 'NotoNaskhArabic-Regular', text: 'Classic Arabic lettering with Naskh character: balanced stroke contrast, rounded bowls, clear contextual joins and measured upright proportions. Preserve correct Arabic shaping and identifying marks.'},
  English: {font: 'PlayfairDisplay-SemiBold', text: 'Classic English serif lettering with Playfair character: clear serifs, balanced stroke contrast, rounded bowls and readable mixed-case proportions. Preserve the requested capitalization.'},
});
export const SUPPORT = 'Support every separated letter group, identifying dot, hamza and supplied mark with discreet metal bridges. Keep bridges visibly distinguishable from linguistic strokes and preserve the reading, mark count and placement, intentional counters and linguistic breaks. Each bridge visibly meets the components it supports with a continuous metal connection; point contacts, truncated supports and purported hidden connections are insufficient. Do not add a surrounding frame or full backing plate.';
export const ATTACHMENTS = 'Exactly two integral body eyelets carry the pendant. Each body eyelet receives one separate closed connecting ring; that same connector passes through the first Cable-chain link. Keep eyelets, connectors and alternating chain links distinguishable, with plausible interlocks and visible apertures. Use both body eyelets; no unused eyelets, extra body holes or loose chain ends beside the pendant. Continue the chain beyond the photographic frame.';
export const RECIPES = freeze({
  Classical: {status: 'screening_candidate', paidSupported: true, text: 'Upright lettering forms the main rigid pendant body. Discreet bridges support separated components while retaining recognizable letter groups.', support: SUPPORT, attachment: ATTACHMENTS},
  'Origami ribbon': {status: 'draft_untested', paidSupported: false, text: 'The lettering itself has shallow folded metal planes, with continuous material through each crease and readable letterforms.', support: SUPPORT, attachment: ATTACHMENTS},
  'Framed minimal': {status: 'draft_untested', paidSupported: false, text: 'An open frame carries the lettering through visible support contacts. Frame geometry and contact placement require their own preflight.', support: 'Preserve linguistic breaks and marks while supporting every component through the selected frame.', attachment: 'Exactly two frame eyelets receive separate connectors and the selected chain; the complete recipe requires preflight.'},
  'Diamond rails': {status: 'draft_untested', paidSupported: false, text: 'Two rails carry the lettering through visible supports. Rail and support placement require their own preflight; the family name does not itself request gemstones.', support: 'Preserve linguistic breaks and marks while supporting every component through the selected rails.', attachment: 'Exactly two upper-rail eyelets receive separate connectors and the selected chain; the complete recipe requires preflight.'},
});

export const TEMPLATE = [
  'Create one photorealistic Studio photograph of a newly designed custom-name necklace.',
  '', 'CUSTOMER IDENTITY', '{{identity}}', '{{style}}',
  '', 'REFERENCE ROLES', '{{references}}',
  '', 'DESIGN FREEDOM', '{{creative}}',
  '', 'CONSTRUCTION', '{{construction}}', '{{support}}', '{{attachments}}',
  '', 'CUSTOMER SELECTIONS', '{{selections}}',
  '', 'PHOTOGRAPHY', '{{photography}}',
  '', 'VISIBLE REQUIREMENTS', '{{invariants}}',
].join('\n');
export const VIEW_TEMPLATE = [
  'Create one photograph of the existing necklace identified by @design_anchor in the requested view.',
  '', 'CUSTOMER IDENTITY', '{{identity}}', '{{style}}',
  '', 'DESIGN REFERENCE', '{{references}}',
  '', 'PRESERVE CONSTRUCTION', '{{construction}}', '{{support}}', '{{attachments}}',
  '', 'CUSTOMER SELECTIONS', '{{selections}}',
  '', 'PHOTOGRAPHY', '{{photography}}',
  '', 'VISIBLE REQUIREMENTS', '{{invariants}}',
].join('\n');

function supported(input) {
  const config = normalize(input);
  if (config.construction !== 'Classical' || config.lettering !== 'Classic' || config.twoNames || config.metal !== 'White gold' || config.coverage !== 'No stones' || config.chain !== 'Cable' || config.size !== 32 || config.engraving !== '') {
    throw Error('unsupported_paid_configuration');
  }
  return config;
}

function digest(value, field) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw Error('invalid_' + field);
  return value;
}

function preflight(descriptor) {
  const states = [descriptor.status, typeof descriptor.preflight === 'string' ? descriptor.preflight : descriptor.preflight?.status].filter(s => s !== undefined);
  if (!states.length || states.some(s => !['pass', 'preflight_pass'].includes(s))) throw Error('reference_preflight_required');
  const reviewedHash = descriptor.preflight?.sha256;
  if (reviewedHash !== undefined && reviewedHash !== descriptor.sha256) throw Error('reference_hash_mismatch');
}

function descriptor(value, role) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('reference_required');
  if (value.role !== role || value.tag !== role) throw Error('reference_role_mismatch');
  if (typeof value.id !== 'string' || !value.id.trim() || typeof value.path !== 'string' || !value.path.trim()) throw Error('incomplete_reference');
  digest(value.sha256, 'reference_hash');
  preflight(value);
  return structuredClone(value);
}

function referenceList(method, references) {
  if (!METHODS.includes(method)) throw Error('unknown_method');
  const roles = ROLES[method];
  if (!Array.isArray(references) || references.length !== roles.length) throw Error('reference_role_mismatch');
  const result = references.map((r, i) => descriptor(r, roles[i]));
  if (new Set(result.map(r => r.id)).size !== result.length) throw Error('duplicate_reference_id');
  return result;
}

function roleText(refs) {
  return refs.map((ref, index) => {
    const prefix = `Image ${index + 1}, @${ref.tag}: `;
    if (ref.role === 'lettering') return prefix + 'use only its lettering traits and calligraphic character for the requested name. Its sample writing is not the customer name. Do not copy the sample name or its exact composition and contour.';
    if (ref.role === 'hardware') return prefix + 'use only the body-eyelet, separate-connector and first-chain-link relationship. Place the two attachments to suit this new name. Customer selections control finish and chain; do not copy unrelated shapes, proportions or writing.';
    return prefix + 'this correctly shaped customer-name strip is a spelling and reading-order aid only. Preserve its exact characters, supplied marks and capitalization. Its font outline, spacing and overall silhouette do not prescribe the pendant design.';
  }).join('\n');
}

function commonSlots(config, view) {
  return {
    identity: 'The pendant itself spells ' + JSON.stringify(config.name) + '. ' + config.script + ', ' + (config.script === 'Arabic' ? 'right-to-left' : 'left-to-right') + ' reading. Preserve exact spelling, capitalization, supplied marks and meaningful spaces. One upright name formed from metal, not a printed caption.',
    style: STYLE_TRAITS[config.script].text,
    construction: RECIPES[config.construction].text,
    support: SUPPORT,
    attachments: ATTACHMENTS,
    selections: config.metal + ' appearance with a clean polished finish. Stone-free metal, without gemstones or empty stone seats. ' + config.chain + ' chain with alternating oval links. Nominal selected size label: ' + config.size + ' mm; this image does not certify dimensions. Do not print measurement labels.',
    photography: VIEWS[view].text + ' Show the lettering, support bridges and both attachment junctions clearly enough to inspect their connections.',
    invariants: 'Retain intentional letter counters, linguistic spaces and hardware apertures. Supports must preserve legibility and meet their intended components. No captions, specimen writing, reference labels, logos or unrelated decoration. Use coherent reflections and contact shadows with readable metal edges; do not conceal a critical connection with glare or blur.',
  };
}

function render(template, slots) {
  const prompt = template.replace(/{{([a-z_]+)}}/g, (_, key) => {
    if (typeof slots[key] !== 'string') throw Error('missing_slot:' + key);
    return slots[key];
  });
  if (/{{|}}/.test(prompt)) throw Error('unresolved_slot');
  return prompt;
}

function result(input, config, {kind, method, view, refs, slots, template, anchor}) {
  const prompt = render(template, slots);
  const templateHash = hash(template);
  return freeze({
    version: VERSION, kind, config, configHash: hash(config), sourceStrings: {name: input.name},
    recipeHash: hash({construction: RECIPES[config.construction], style: STYLE_TRAITS[config.script]}),
    templateHash, prompt, promptHash: hash(prompt), method, view, ratio: VIEWS[view].ratio,
    model: 'gpt-image-2', quality: null, imageSize: null, referenceDescriptors: refs, slots,
    ...(anchor ? {anchor: structuredClone(anchor)} : {}),
    release: {version: VERSION, status: 'candidate', productionApproved: false, qualification: 'untested', templateHash},
  });
}

export function compileNewDesign(input, {method = 'text', references = [], view = 'Studio'} = {}) {
  const config = supported(input);
  if (view !== 'Studio') throw Error('new_design_requires_studio');
  const refs = referenceList(method, references);
  const slots = {...commonSlots(config, view), references: roleText(refs), creative: 'Create an original name-specific composition in the selected lettering style. You may adapt letter proportions, spacing, permitted flourishes and discreet support placement while preserving spelling and correct shaping. The selected construction and hardware relationship are fixed; no pre-existing pendant silhouette is prescribed.'};
  return result(input, config, {kind: 'new_design', method, view, refs, slots, template: TEMPLATE});
}

export function compileView(input, {view, anchor} = {}) {
  const config = supported(input);
  if (!Object.hasOwn(VIEWS, view) || view === 'Studio') throw Error('invalid_continuation_view');
  if (!anchor || typeof anchor !== 'object') throw Error('design_anchor_required');
  if (anchor.configHash !== hash(config)) throw Error('anchor_configuration_mismatch');
  if (anchor.kind !== 'new_design' || anchor.view !== 'Studio') throw Error('anchor_must_be_original_studio');
  digest(anchor.outputHash, 'anchor_output_hash');
  const ref = descriptor({id: anchor.id, path: anchor.path, sha256: anchor.outputHash, role: 'design_anchor', tag: 'design_anchor', status: anchor.status, preflight: anchor.preflight}, 'design_anchor');
  const slots = {...commonSlots(config, view), references: 'Image 1, @design_anchor: this original Studio image identifies the existing necklace. Preserve its exact name, letter composition, silhouette, mark placement, support layout, two body eyelets, connectors, chain and finish. Change only the photographic view and its presentation. Keep the same object; do not add or relocate jewelry components.'};
  return result(input, config, {kind: 'view', method: 'design_anchor', view, refs: [ref], slots, template: VIEW_TEMPLATE, anchor});
}
