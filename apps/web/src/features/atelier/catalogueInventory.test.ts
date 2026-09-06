import { expect, it } from 'vitest';
import { catalogueFingerprint, configurationId, fixedSpecification, indexInventory, missingPhotoJobs, photoJobId } from './catalogueInventory';
import { configurations, sampleKey, samples } from './catalogue';
import { emptyDraft, views } from './model';

it('partitions every possible photo into integrated or uniquely planned, with valid Studio dependencies', () => {
 const integrated=indexInventory(samples);const integratedJobIds=new Set(samples.map(a=>photoJobId(a.draft,a.view)));
 const jobs=new Set<string>();const parentJobs=new Set<string>();let total=0;
 for(const job of missingPhotoJobs(samples)) {
  if(jobs.has(job.jobId)||integrated.has(job.canonicalKey))throw new Error('Duplicate or overlapping job');
  jobs.add(job.jobId);total++;
  if(job.reference?.kind==='planned')parentJobs.add(job.reference.jobId);
  if(job.reference && job.role==='camera-view' && job.reference.configurationId!==job.configurationId)throw new Error('Camera would reference another configuration');
  if(job.reference?.kind==='integrated') {
   const referenceId=job.reference.assetId;
   const ref=samples.find(a=>a.id===referenceId);
   if(!ref || ref.view!=='Studio' || configurationId(ref.draft)!==job.reference.configurationId)throw new Error('Invalid integrated reference');
  }
 }
 for(const parent of parentJobs)if(!jobs.has(parent)&&!integratedJobIds.has(parent))throw new Error('Missing dependency');
 let configurationsCount=0;let photos=0;for(const draft of configurations()){configurationsCount++;for(const view of views){photos++;const key=sampleKey(draft,view);if(!integrated.has(key)&&!jobs.has(photoJobId(draft,view)))throw new Error('Unplanned key');}}
 expect(configurationsCount).toBe(131328);expect(photos).toBe(525312);expect(total+integrated.size).toBe(photos);
},60000);

it('IDs and fingerprints survive ordering changes and ignore customer/inactive fields', () => {
 const edited={...emptyDraft,name:'Customer',secondName:'Other',gem:'Ruby' as const,layout:'Stacked' as const};
 expect(photoJobId(edited,'Studio')).toBe(photoJobId(emptyDraft,'Studio'));
 expect(catalogueFingerprint([...samples].reverse())).toBe(catalogueFingerprint(samples));
 const first=(assets:typeof samples)=>{const ids:string[]=[];for(const job of missingPhotoJobs(assets)){ids.push(job.jobId);if(ids.length===3)break;}return ids;};
 expect(first(samples)).toEqual(first([...samples].reverse()));
},60000);

it('fixes names and clears inactive options without inventing customer inputs', () => {
 expect(fixedSpecification({...emptyDraft,name:'Customer',secondName:'Other'})).toMatchObject({names:['Asma'],layout:null,gemstone:null});
 expect(fixedSpecification({...emptyDraft,script:'Arabic',twoNames:true})).toMatchObject({names:['أسماء','فاطمة']});
 expect(fixedSpecification(emptyDraft)).not.toHaveProperty('engraving');
 expect(fixedSpecification(emptyDraft)).not.toHaveProperty('length');
});

it('fails closed on duplicate catalogue keys rather than silently replacing an asset', () => {
 const first=samples[0];if(!first)throw new Error("Missing catalogue fixture");
 expect(()=>indexInventory([...samples,first])).toThrow(/Duplicate/);
});

it('a metal/stone variant keeps every structural field in its parent Studio', () => {
 const draft={...emptyDraft,script:'Arabic' as const,twoNames:true,layout:'Stacked' as const,construction:'Diamond rails' as const,lettering:'Kufi' as const,chain:'Box' as const,size:22 as const,metal:'Rose gold' as const,coverage:'Full pavé' as const,gem:'Ruby' as const};
 const target=photoJobId(draft,'Studio');
 let found=false;
 for(const job of missingPhotoJobs(samples))if(job.jobId===target){
  found=true;expect(job.role).toBe('material-variant');
  expect(job.reference?.configurationId).toBe(configurationId({...draft,metal:'Yellow gold',coverage:'No stones'}));
  expect(job.specification).toMatchObject({script:'Arabic',names:['أسماء','فاطمة'],layout:'Stacked',construction:'Diamond rails',lettering:'Kufi',chainStyle:'Box',pendantWidthMm:22,metal:'Rose gold',coverage:'Full pavé',gemstone:'Ruby'});
  break;
 }
 expect(found).toBe(true);
},30000);
