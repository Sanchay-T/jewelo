import { expect, it } from 'vitest';
import { configurations, differences, resolveOptionFamily, sampleKey, samples } from './catalogue';
import { emptyDraft, visualFields } from './model';

it('only publishes photos that match every active selected visual attribute', () => {
  const indexed = new Map<string, typeof samples>();
  for (const sample of samples) {
    const key = sampleKey(sample.draft, "Studio");
    indexed.set(key, [...(indexed.get(key) ?? []), sample]);
  }
  let count = 0;
  for (const draft of configurations()) {
    count++;
    const expected = indexed.get(sampleKey(draft, 'Studio')) ?? [];
    const family = resolveOptionFamily(draft);
    expect(family.missing).toBe(!expected.some(s => s.view === 'Studio'));
    for (const photo of family.assets) expect(differences(draft, photo.draft)).toEqual([]);
    if (family.missing) expect(family.assets).toEqual([]);
    else expect(family.assets.map(s => s.id).sort()).toEqual(expected.map(s => s.id).sort());
  }
  expect(count).toBe(131328);
}, 60000);

it('click order cannot override the complete configuration', () => {
  for (const sample of samples.filter(s => s.view === 'Studio')) {
    const expected = resolveOptionFamily(sample.draft);
    for (const field of visualFields) {
      const result = resolveOptionFamily(sample.draft, field);
      expect(result.configurationKey).toBe(expected.configurationKey);
      expect(result.assets.map(s => s.id)).toEqual(expected.assets.map(s => s.id));
      expect(result.anchor.exact).toBe(true);
    }
  }
});

it('never replaces Arabic rails Kufi with English origami or classical when changing metals or stones', () => {
  for (const metal of ['Yellow gold', 'White gold', 'Rose gold'] as const)
    for (const coverage of ['No stones', 'Accent', 'Partial pavé', 'Full pavé'] as const) {
      const draft = {...emptyDraft, script:'Arabic' as const, construction:'Diamond rails' as const, lettering:'Kufi' as const, chain:'Rolo' as const, metal, coverage};
      for (const focus of ['metal','coverage'] as const) {
        const family = resolveOptionFamily(draft,focus);
        for (const photo of family.assets) expect(differences(draft,photo.draft)).toEqual([]);
        if (!family.anchor.exact) expect(family.assets).toEqual([]);
      }
    }
});

it('customer spelling and inactive layout or gemstone do not change sample identity', () => {
  const draft={...emptyDraft,name:'Maya',secondName:'Sara',layout:'Stacked' as const,gem:'Ruby' as const};
  expect(resolveOptionFamily(draft).configurationKey).toBe(resolveOptionFamily(emptyDraft).configurationKey);
  expect(resolveOptionFamily(draft).assets.map(s=>s.id)).toEqual(resolveOptionFamily(emptyDraft).assets.map(s=>s.id));
});
