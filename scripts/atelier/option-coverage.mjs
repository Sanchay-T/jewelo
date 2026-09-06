/** Read-only option-photo coverage. Run: node scripts/atelier/option-coverage.mjs [output.json] */
import { createRequire } from 'node:module';
import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const requireWeb = createRequire(resolve(root, 'apps/web/package.json'));
const requireVitest = createRequire(requireWeb.resolve('vitest/package.json'));
const { createServer } = await import(requireVitest.resolve('vite'));
const server = await createServer({ root: resolve(root, 'apps/web'), configFile: false, server: { middlewareMode: true } });
try {
  const { samples, sampleKey } = await server.ssrLoadModule('/src/features/atelier/catalogue.ts');
  const { emptyDraft } = await server.ssrLoadModule('/src/features/atelier/model.ts');
  const views = ['Studio', 'On skin', 'Close-up', 'Dark'];
  const key = draft => sampleKey(draft, 'Studio');
  const baseline = samples.filter(s => /^\/atelier\/v[123]\//.test(s.src));
  const targets = new Map(baseline.map(s => [key(s.draft), s.draft]));
  for (const construction of ['Origami ribbon', 'Framed minimal', 'Diamond rails']) {
    const draft = { ...emptyDraft, script: 'Arabic', construction };
    targets.set(key(draft), draft);
  }
  for (const layout of ['Side by side', 'Connected heart', 'Stacked', 'Infinity', 'Interlocked']) {
    const draft = { ...emptyDraft, script: 'Arabic', twoNames: true, layout };
    targets.set(key(draft), draft);
  }
  const integrated = new Map(samples.map(s => [sampleKey(s.draft,s.view),s]));
  const accepted = new Map();
  const excluded = [];
  for (const version of [4,5,6,7]) {
    let manifest;
    try { manifest = JSON.parse(await readFile(resolve(root,`apps/web/public/atelier/v${version}/manifest.json`),'utf8')); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    for (const asset of manifest.assets ?? []) {
      const src = `/atelier/v${version}/${asset.file}`;
      const acceptedStatus = ['accepted','accepted-concept'].includes(asset.review?.status);
      let present = true;
      try { await access(resolve(root,'apps/web/public'+src)); } catch { present = false; }
      if (!acceptedStatus || !present) { excluded.push({src,status:asset.review?.status ?? 'unreviewed',present}); continue; }
      accepted.set(sampleKey({...emptyDraft,...asset.patch},asset.view),{id:asset.id,src,review:asset.review});
    }
  }
  const families = [...targets].map(([identity,draft]) => ({identity, views: views.map(view => {
    const imageKey = sampleKey(draft,view), live = integrated.get(imageKey), pending = accepted.get(imageKey);
    return {view,status:live?'integrated':pending?'accepted-not-integrated':'missing',src:live?.src??pending?.src??null};
  })}));
  const rows = families.flatMap(f=>f.views);
  const report = {
    generatedAt:new Date().toISOString(), scope:'45 option-example families, not all cumulative permutations; metadata coverage does not certify visual accuracy',
    baseline:{families:new Set(baseline.map(s=>key(s.draft))).size,photos:baseline.length},
    required:{families:targets.size,photos:targets.size*4},
    current:{integratedPhotos:rows.filter(r=>r.status==='integrated').length,acceptedNotIntegrated:rows.filter(r=>r.status==='accepted-not-integrated').length,missing:rows.filter(r=>r.status==='missing').length,completeIntegratedFamilies:families.filter(f=>f.views.every(v=>v.status==='integrated')).length},
    excluded, families,
  };
  if (report.baseline.families !== 37 || report.baseline.photos !== 82 || report.required.families !== 45) throw new Error('Unexpected baseline/target drift; review coverage scope.');
  const output=process.argv[2];
  if(output) await writeFile(resolve(output),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(output?{baseline:report.baseline,required:report.required,current:report.current,output}:report,null,2));
} finally { await server.close(); }
