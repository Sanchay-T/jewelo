/** Offline only. Default emits a summary; --out PATH streams all missing jobs. */
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { exportInventory } from './inventory-export.mjs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const req=createRequire(resolve(root,'apps/web/package.json'));
const reqV=createRequire(req.resolve('vitest/package.json'));
const {createServer}=await import(reqV.resolve('vite'));
const args=process.argv.slice(2); const outIndex=args.indexOf('--out'); const out=outIndex<0?null:args[outIndex+1];
if(args.length && (args.length!==2 || outIndex!==0 || !out)) throw new Error('Usage: node scripts/atelier/catalogue-inventory.mjs [--out PATH]');
const server=await createServer({root:resolve(root,'apps/web'),configFile:false,server:{middlewareMode:true}});
try {
 const {samples,configurations,sampleKey}=await server.ssrLoadModule('/src/features/atelier/catalogue.ts');
 const {missingPhotoJobs,catalogueFingerprint,inventoryRelease,indexInventory}=await server.ssrLoadModule('/src/features/atelier/catalogueInventory.ts');
 let sourceBytes=0;
 const assets=await Promise.all(samples.map(async a=>{const bytes=await readFile(resolve(root,'apps/web/public'+a.src));sourceBytes+=bytes.length;return {...a,sha256:createHash('sha256').update(bytes).digest('hex')};}));
 const integrated=indexInventory(assets);
 let configurationCount=0; const valid=new Set();
 for(const draft of configurations()){configurationCount++;for(const view of ['Studio','On skin','Close-up','Dark'])valid.add(sampleKey(draft,view));}
 for(const key of integrated.keys()) if(!valid.has(key)) throw new Error(`Integrated asset outside current option space: ${key}`);
 const produce=async write=>{
 let missing=0;const roles={};const exampleJobs=[];
 for(const job of missingPhotoJobs(assets)) {
  missing++;roles[job.role]=(roles[job.role]??0)+1;if(exampleJobs.length<8)exampleJobs.push(job);
  if(write)await write(job);
 }
 const summary={release:inventoryRelease,generatedAt:new Date().toISOString(),catalogueFingerprint:catalogueFingerprint(assets),configurations:configurationCount,requiredPhotos:valid.size,integratedPhotos:integrated.size,missingPhotos:missing,roles,
  complete:missing===0,execution:'offline-inventory-only',paidRequests:0,
  review:'Integrated assets retain prior review status. Planned jobs are neither generated nor approved.',
  excludedInputs:['customer spelling (fixed examples only)','engraving','special requests','chain length'],
  storageEstimate:{method:'Current integrated PNG average multiplied by required photo count; not an optimized delivery estimate.',currentBytes:sourceBytes,estimatedFullBytes:Math.round(sourceBytes/assets.length*valid.size)},
  output:out?resolve(out):null,exampleJobs};
 if(summary.integratedPhotos+missing!==valid.size)throw new Error('Coverage partition failed');
 return summary;
 };
 const summary=out?await exportInventory(resolve(out),produce):await produce();
 console.log(JSON.stringify(summary,null,2));
} finally {await server.close();}
