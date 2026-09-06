import {readFileSync,writeFileSync,mkdirSync,existsSync,realpathSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileNewDesign,hash,METHODS,RECIPES,TEMPLATE,VIEW_TEMPLATE} from './compiler.mjs';
import {createState,initializeJournal,HARD_GATES,ANCHOR_NAMES} from './ledger.mjs';
export const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
export const OUT=resolve(ROOT,'reviews/2026-09-06-creative-name-v2');
export const read=p=>JSON.parse(readFileSync(p,'utf8'));
export const write=(p,value)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,JSON.stringify(value,null,2)+'\n',{flag:'wx'});};
export const NAMES=[['ar-liyan','Arabic','ليان'],['ar-noor','Arabic','نور'],['ar-iman','Arabic','إيمان'],['en-ava','English','Ava'],['en-lily','English','Lily'],['en-christopher','English','Christopher']];
export function verifyReference(r){
 if(r.preflight?.status!=='pass'||r.preflight.sha256!==r.sha256||hash(readFileSync(resolve(ROOT,r.path)))!==r.sha256)throw Error('reference_bytes_or_preflight_invalid:'+r.id);
 return r;
}
export function prepare(account){
 if(existsSync(resolve(OUT,'campaign.json')))throw Error('frozen_campaign_already_exists');
 const refs=read(resolve(OUT,'references/manifest.json')).references.map(verifyReference);
 const rubric={version:'creative-name-v2-rubric-1',hardGates:HARD_GATES,criteria:{
 identity:'Read back exact requested name, capitalization, script, dots and hamzas. Preserve reading order. Meaningful linguistic breaks and counters remain readable.',
 construction:'Every separated letter group and identifying mark is visibly supported by continuous metal. Discreet bridges are allowed, point contacts or inferred hidden support are insufficient. No full backing plate or frame.',
 attachments:'Exactly two integral body eyelets, each receiving a separate closed connector linked to the first cable-chain link. Distinguishable plausible interlocks and readable apertures; no gaps or unused holes.',
 selections:'Classical, Classic style, white gold appearance, no stones or empty seats, cable chain, one name and no engraving. Nominal32 label is not a physical measurement claim.',
 photography:'Believable metal, coherent light and contact; complete pendant and both junctions inspectable. Unreadable critical details cannot pass.',
 unrequested_content:'No captions, logos, unrelated decoration or writing.',
 reference_leakage:'No specimen names, diagram labels or unrelated reference shapes copied.'},
 styleScale:{1:'wrong style',2:'substantial mismatch',3:'recognizable with deviations',4:'close fit',5:'strong fit'},
 uncertainty:'needs_review fails advancement; disagreement remains needs_review until adjudicated',
 comparison:'Review images and crops using blind IDs before revealing method and prompt. Record appeal separately.',
 selection:'All12 hard-pass and all style scores >=3. Highest median style, ties fewer references.',
 anchors:ANCHOR_NAMES,anchorRepeat:1,qualification:'Diagnostic only; no99% or production claim.'};
 write(resolve(OUT,'rubric.json'),rubric);
 let random=20260906;
 const rng=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
 const cases=[];
 for(const [slug,script,name] of NAMES)for(const method of METHODS)for(let repeat=1;repeat<=2;repeat++){
  const config={name,script,construction:'Classical',lettering:'Classic',metal:'White gold',coverage:'No stones',size:32,chain:'Cable',twoNames:false,engraving:''};
  const r=[];
  if(method!=='text')r.push(refs.find(x=>x.id==='lettering-'+(script==='Arabic'?'ar':'en')));
  if(method.includes('hardware'))r.push(refs.find(x=>x.id==='hardware'));
  if(method.includes('spelling'))r.push(refs.find(x=>x.id==='spelling-'+slug));
  const compiled=compileNewDesign(config,{method,references:r});
  cases.push({id:slug+'-'+method+'-r'+repeat,method,repeat,configHash:compiled.configHash,compiled});
 }
 for(let i=cases.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[cases[i],cases[j]]=[cases[j],cases[i]];}
 cases.forEach((c,i)=>{c.blindId='V2-'+String(i+1).padStart(2,'0');write(resolve(OUT,'prompts',c.id+'.json'),c.compiled);writeFileSync(resolve(OUT,'prompts',c.id+'.txt'),c.compiled.prompt,{flag:'wx'});});
 const manifest=cases.map(({compiled,...c})=>({...c,compiledHash:hash(compiled),promptHash:compiled.promptHash,promptFile:'prompts/'+c.id+'.json'}));
 write(resolve(OUT,'cases.json'),manifest);
 const campaign={version:'2.0.0',status:'frozen_for_screening',createdAt:new Date().toISOString(),seed:20260906,
  rubricHash:hash(rubric),casesHash:hash(manifest),referenceManifestHash:hash(readFileSync(resolve(OUT,'references/manifest.json'))),
  initialBalance:account.credits,accountTeamId:account.teamId,stages:{screening:48,continuityConditional:12},
  credits:{cap:2460,reservationPerSubmission:41,actualPrice:'unknown until reconciled',purchasesAllowed:false},
  provider:{model:'gpt-image-2',count:1,maxActive:2,quality:null,imageSize:null},
  fixedAnchors:ANCHOR_NAMES,limitations:['Only Classical/Classic, white gold, stone-free, Cable32, single names.','Other constructions are untested drafts.','No dimensional certification.','No99% qualification or production integration.'],
  releaseFiles:Object.fromEntries(['compiler.mjs','ledger.mjs','prepare.mjs','references.py','journal.mjs','../compiler.mjs'].map(f=>[f,hash(readFileSync(resolve(ROOT,'scripts/prompt-lab/v2',f)))]))};
 write(resolve(OUT,'campaign.json'),campaign);
 write(resolve(OUT,'recipes.json'),RECIPES);
 writeFileSync(resolve(OUT,'master-template.txt'),TEMPLATE+'\n',{flag:'wx'});
 writeFileSync(resolve(OUT,'view-template.txt'),VIEW_TEMPLATE+'\n',{flag:'wx'});
 initializeJournal(resolve(OUT,'ledger.json'),createState({account,policyChange:'User explicitly chose kit plus bounded paid tests: up to60 NEW submissions and2460 credits, replacing our earlier precautionary cumulative50 boundary. This is authorization, not provider quota reset evidence.'}));
 return {cases:cases.length,rubricHash:campaign.rubricHash,referenceCount:refs.length};
}
if(process.argv[1]&&realpathSync(process.argv[1])===fileURLToPath(import.meta.url))prepare(JSON.parse(readFileSync(0,'utf8')));
