import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {OUT,ROOT,read,verifyReference} from './prepare.mjs';
import {hash} from './compiler.mjs';
import * as ledger from './ledger.mjs';
const action=process.argv[2],input=JSON.parse(readFileSync(0,'utf8')||'{}'),path=resolve(OUT,'ledger.json');
function frozen(){
 const campaign=read(resolve(OUT,'campaign.json'));
 for(const [f,sha] of Object.entries(campaign.releaseFiles))if(hash(readFileSync(resolve(ROOT,'scripts/prompt-lab/v2',f)))!==sha)throw Error('frozen_release_mutated:'+f);
 if(hash(read(resolve(OUT,'cases.json')))!==campaign.casesHash||hash(read(resolve(OUT,'rubric.json')))!==campaign.rubricHash||hash(readFileSync(resolve(OUT,'references/manifest.json')))!==campaign.referenceManifestHash)throw Error('campaign_inputs_mutated');
 return campaign;
}
let result;
if(action==='state')result=read(path);
else if(action==='next'){
 frozen();const state=read(path),cases=read(resolve(OUT,'cases.json'));
 result={...ledger.ready(state),next:cases.find(c=>!state.entries.some(e=>e.caseId===c.id))??null};
}else result=ledger.transact(path,state=>{
 if(action==='reserve'){
  frozen();const c=read(resolve(OUT,'cases.json')).find(c=>!state.entries.some(e=>e.caseId===c.id));if(!c||c.id!==input.id)throw Error('must_reserve_next_randomized_case');
  const compiled=read(resolve(OUT,c.promptFile));
  if(hash(compiled)!==c.compiledHash||hash(compiled.prompt)!==c.promptHash||hash(compiled.config)!==c.configHash)throw Error('compiled_case_mutated');
  compiled.referenceDescriptors.forEach(verifyReference);
  const entry=ledger.reserve(state,compiled,'screening',c.id,c.repeat);
  return {entry,compiled};
 }
 if(action==='submitted')return ledger.submitted(state,input.key,input.result);
 if(action==='finish')return ledger.finish(state,input.key,input.result);
 if(action==='checkpoint')return ledger.checkpoint(state,input);
 if(action==='audit')return ledger.recordAudit(state,input.key,input.audit);
 if(action==='select'){const selection=ledger.selectCandidate(state,read(resolve(OUT,'cases.json')),{rubricHash:read(resolve(OUT,'campaign.json')).rubricHash});state.selection=selection;return selection;}
 if(action==='reconcile')return ledger.reconcile(state,input.key,input.evidence);
 throw Error('unknown_action');
});
console.log(JSON.stringify(result));
