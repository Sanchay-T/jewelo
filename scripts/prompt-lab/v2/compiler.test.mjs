import test from 'node:test';
import assert from 'node:assert/strict';
import { compileNewDesign, compileView, normalize, hash, METHODS, RECIPES, TEMPLATE, VIEW_TEMPLATE, VIEWS } from './compiler.mjs';

const input = (overrides = {}) => ({name: 'إيمان', script: 'Arabic', construction: 'Classical', lettering: 'Classic', twoNames: false, metal: 'White gold', coverage: 'No stones', size: 32, chain: 'Cable', ...overrides});
const ref = (role, overrides = {}) => ({id: role + '-v1', tag: role, role, path: '/references/' + role + '.png', sha256: hash(role), preflight: {status: 'pass', sha256: hash(role)}, ...overrides});
const roles = {text: [], style: ['lettering'], style_hardware: ['lettering', 'hardware'], style_hardware_spelling: ['lettering', 'hardware', 'spelling']};
const anchor = (overrides = {}) => ({id: 'studio-001', outputHash: hash('studio bytes'), path: '/outputs/studio-001.png', configHash: hash(normalize(input())), kind: 'new_design', view: 'Studio', status: 'preflight_pass', ...overrides});

test('four nested methods change reference roles while keeping all semantic slots fixed', () => {
  const outputs = METHODS.map(method => compileNewDesign(input(), {method, references: roles[method].map(role => ref(role))}));
  const baseline = outputs[0];
  for (const output of outputs) {
    assert.equal(output.configHash, baseline.configHash);
    assert.equal(output.recipeHash, baseline.recipeHash);
    assert.equal(output.templateHash, hash(TEMPLATE));
    assert.equal(output.promptHash, hash(output.prompt));
    for (const key of Object.keys(baseline.slots).filter(key => key !== 'references')) assert.equal(output.slots[key], baseline.slots[key]);
    assert.deepEqual(output.referenceDescriptors.map(r => r.role), roles[output.method]);
    assert.equal(output.kind, 'new_design');
    assert.equal(output.view, 'Studio');
    assert.equal(output.ratio, '1:1');
    assert.equal(output.model, 'gpt-image-2');
    assert.equal(output.release.productionApproved, false);
    assert.ok(!output.prompt.includes('{{'));
  }
  assert.equal(new Set(outputs.map(o => o.promptHash)).size, 4);
});

test('native name, hamza, supplied marks, case and original source string are preserved', () => {
  for (const name of ['ليان', 'نور', 'إيمان', 'إِيمَان']) {
    const output = compileNewDesign(input({name}));
    assert.equal(output.config.name, name);
    assert.equal(output.sourceStrings.name, name);
    assert.ok(output.prompt.includes(JSON.stringify(name)));
  }
  const raw = 'ا\u0655يمان';
  const output = compileNewDesign(input({name: raw}));
  assert.equal(output.config.name, 'إيمان');
  assert.equal(output.sourceStrings.name, raw);
  const latin = compileNewDesign(input({name: 'Christopher', script: 'English'}));
  assert.ok(latin.prompt.includes('"Christopher"'));
  assert.ok(latin.prompt.includes('Playfair'));
  assert.ok(!latin.prompt.includes('Naskh'));
  assert.ok(compileNewDesign(input()).prompt.includes('Naskh'));
});

test('inactive second name, layout, gem and empty optional request never leak into prompts', () => {
  const output = compileNewDesign(input({secondName: 'DoNotCopy', layout: 'Infinity', gem: 'Ruby', requests: ' '}));
  for (const value of ['DoNotCopy', 'Infinity', 'Ruby']) assert.ok(!output.prompt.includes(value));
  for (const key of ['secondName', 'layout', 'gem', 'requests']) assert.ok(!Object.hasOwn(output.config, key));
});

test('reference requirements enforce ordered roles, tags, preflight and hash shape', () => {
  const compile = references => compileNewDesign(input(), {method: 'style_hardware', references});
  assert.throws(() => compile([]), /reference_role_mismatch/);
  assert.throws(() => compile([ref('hardware'), ref('lettering')]), /reference_role_mismatch/);
  assert.throws(() => compile([ref('lettering', {tag: 'hardware'}), ref('hardware')]), /reference_role_mismatch/);
  assert.throws(() => compile([ref('lettering', {sha256: 'wrong'}), ref('hardware')]), /invalid_reference_hash/);
  assert.throws(() => compile([ref('lettering', {sha256: hash('different bytes')}), ref('hardware')]), /reference_hash_mismatch/);
  assert.throws(() => compile([ref('lettering', {preflight: undefined}), ref('hardware')]), /reference_preflight_required/);
  assert.throws(() => compile([ref('lettering', {status: 'reject'}), ref('hardware')]), /reference_preflight_required/);
  assert.throws(() => compile([ref('lettering', {path: ''}), ref('hardware')]), /incomplete_reference/);
  assert.throws(() => compile([ref('lettering'), ref('hardware', {id: 'lettering-v1'})]), /duplicate_reference_id/);
  assert.throws(() => compileNewDesign(input(), {method: 'text', references: [ref('lettering')]}), /reference_role_mismatch/);
  assert.throws(() => compileNewDesign(input(), {method: 'body'}), /unknown_method/);
});

test('all reference assets are copied and frozen without freezing caller objects', () => {
  const reference = ref('lettering');
  const output = compileNewDesign(input(), {method: 'style', references: [reference]});
  reference.path = '/changed.png';
  assert.equal(output.referenceDescriptors[0].path, '/references/lettering.png');
  assert.ok(Object.isFrozen(output));
  assert.ok(Object.isFrozen(output.config));
  assert.ok(Object.isFrozen(output.referenceDescriptors[0]));
  assert.throws(() => { output.slots.identity = 'changed'; }, TypeError);
});

test('paid scope rejects other families and all unsupported active configuration choices', () => {
  assert.equal(Object.keys(RECIPES).length, 4);
  for (const [family, recipe] of Object.entries(RECIPES)) {
    if (family === 'Classical') continue;
    assert.equal(recipe.status, 'draft_untested');
    assert.equal(recipe.paidSupported, false);
    assert.throws(() => compileNewDesign(input({construction: family})), /unsupported_paid_configuration/);
  }
  for (const overrides of [{lettering: 'Minimal'}, {metal: 'Yellow gold'}, {coverage: 'Accent', gem: 'Ruby'}, {chain: 'Rolo'}, {size: 22}, {engraving: 'secret'}, {twoNames: true, secondName: 'نور', layout: 'Stacked'}]) {
    assert.throws(() => compileNewDesign(input(overrides)), /unsupported_paid_configuration/);
  }
  assert.throws(() => compileNewDesign(input(), {view: 'Dark'}), /new_design_requires_studio/);
  assert.throws(() => compileNewDesign(), /configuration_required/);
  assert.throws(() => compileNewDesign(input({name: undefined})), /name_required/);
  assert.throws(() => compileNewDesign(input({name: 'Ava'})), /script_mismatch/);
  assert.throws(() => compileNewDesign(input({requests: 'add diamonds'})), /unresolved_optional_request/);
});

test('three continuation views independently bind to the same original Studio identity', () => {
  const original = anchor();
  const outputs = ['On skin', 'Close-up', 'Dark'].map(view => compileView(input(), {view, anchor: original}));
  for (const output of outputs) {
    assert.equal(output.kind, 'view');
    assert.equal(output.method, 'design_anchor');
    assert.equal(output.ratio, VIEWS[output.view].ratio);
    assert.equal(output.templateHash, hash(VIEW_TEMPLATE));
    assert.equal(output.anchor.id, original.id);
    assert.equal(output.anchor.outputHash, original.outputHash);
    assert.equal(output.referenceDescriptors.length, 1);
    assert.equal(output.referenceDescriptors[0].role, 'design_anchor');
    assert.equal(output.referenceDescriptors[0].sha256, original.outputHash);
    assert.ok(output.prompt.includes('@design_anchor'));
    assert.ok(!output.prompt.includes('DESIGN FREEDOM'));
    assert.ok(!output.prompt.includes('Create an original'));
    assert.ok(!Object.hasOwn(output.slots, 'creative'));
  }
  assert.equal(new Set(outputs.map(o => o.promptHash)).size, 3);
  assert.notEqual(outputs[0].promptHash, compileView(input(), {view: 'Dark', anchor: original}).promptHash);
  assert.equal(outputs[0].referenceDescriptors[0].path, outputs[2].referenceDescriptors[0].path);
});

test('continuation rejects missing anchors, name/config mismatch, unreviewed sources and view chains', () => {
  assert.throws(() => compileView(input(), {view: 'Dark'}), /design_anchor_required/);
  assert.throws(() => compileView(input({name: 'نور'}), {view: 'Dark', anchor: anchor()}), /anchor_configuration_mismatch/);
  assert.throws(() => compileView(input(), {view: 'Dark', anchor: anchor({outputHash: ''})}), /invalid_anchor_output_hash/);
  assert.throws(() => compileView(input(), {view: 'Dark', anchor: anchor({kind: 'view', view: 'On skin'})}), /anchor_must_be_original_studio/);
  assert.throws(() => compileView(input(), {view: 'Dark', anchor: anchor({status: 'needs_review'})}), /reference_preflight_required/);
  assert.throws(() => compileView(input(), {view: 'Studio', anchor: anchor()}), /invalid_continuation_view/);
  assert.throws(() => compileView(input(), {view: 'toString', anchor: anchor()}), /invalid_continuation_view/);
});
