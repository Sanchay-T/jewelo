import { expect, it } from 'vitest';
import { configurations, hasExactSample, resolveOptionFamily, samples, tier1Differences, tier1Key } from './catalogue';
import { chains, coverages, emptyDraft, gems, metals, visualFields } from './model';

it('publishes only photographs of the selected design, across every configuration', () => {
  // Tier 1 (script, names and layout, construction, lettering) must match the
  // photograph exactly. Tier 2 (gold, stones, gem, width, chain) belongs to the
  // customer's own preview and may never select or change the photograph.
  const byDesign = new Map<string, string>();
  let count = 0;
  for (const draft of configurations()) {
    count++;
    const family = resolveOptionFamily(draft);
    const design = tier1Key(draft);
    const published = family.assets.map(photo => photo.id).join('|') + '/' + family.basis;
    const first = byDesign.get(design);
    if (first === undefined) byDesign.set(design, published);
    else expect(published).toBe(first);
    expect(family.missing).toBe(!hasExactSample(draft));
    for (const photo of family.assets) {
      // Every published photo belongs to the one design being illustrated,
      // and never to another construction.
      expect(tier1Differences(photo.draft, family.shown!)).toEqual([]);
      expect(photo.draft.construction).toBe(draft.construction);
      if (!family.missing) expect(tier1Differences(draft, photo.draft)).toEqual([]);
    }
  }
  expect(count).toBe(131328);
  expect(byDesign.size).toBe(288);
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
  const design = {...emptyDraft, script:'Arabic' as const, name:'أسماء', construction:'Diamond rails' as const, lettering:'Kufi' as const, chain:'Rolo' as const};
  const baseline = resolveOptionFamily(design);
  expect(baseline.anchor.exact).toBe(true);
  expect(baseline.assets.length).toBe(4);
  for (const metal of metals)
    for (const coverage of coverages)
      for (const gem of gems)
        for (const size of [22, 32] as const)
          for (const chain of chains)
            for (const focus of ['metal','coverage','gem','size','chain'] as const) {
              const family = resolveOptionFamily({...design, metal, coverage, gem, size, chain}, focus);
              expect(family.assets.map(photo => photo.id)).toEqual(baseline.assets.map(photo => photo.id));
              expect(family.anchor.asset?.id).toBe(baseline.anchor.asset?.id);
              for (const photo of family.assets) {
                expect(photo.draft.script).toBe('Arabic');
                expect(photo.draft.construction).toBe('Diamond rails');
                expect(photo.draft.lettering).toBe('Kufi');
              }
            }
});

it('customer spelling and inactive layout or gemstone do not change sample identity', () => {
  const draft={...emptyDraft,name:'Maya',secondName:'Sara',layout:'Stacked' as const,gem:'Ruby' as const};
  expect(resolveOptionFamily(draft).configurationKey).toBe(resolveOptionFamily(emptyDraft).configurationKey);
  expect(resolveOptionFamily(draft).assets.map(s=>s.id)).toEqual(resolveOptionFamily(emptyDraft).assets.map(s=>s.id));
});
