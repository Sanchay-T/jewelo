import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {OUT,ROOT,read,verifyReference} from './prepare.mjs';
import {hash} from './compiler.mjs';
const campaign=read(resolve(OUT,'campaign.json')),cases=read(resolve(OUT,'cases.json')),state=read(resolve(OUT,'ledger.json')),errors=[];
const check=(ok,message)=>{if(!ok)errors.push(message);};
check(hash(cases)===campaign.casesHash,'case_manifest_changed');
check(hash(read(resolve(OUT,'rubric.json')))===campaign.rubricHash,'rubric_changed');
check(hash(readFileSync(resolve(OUT,'references/manifest.json')))===campaign.referenceManifestHash,'reference_manifest_changed');
for(const[f,h]of Object.entries(campaign.releaseFiles))check(hash(readFileSync(resolve(ROOT,'scripts/prompt-lab/v2',f)))===h,'release_changed:'+f);
for(const c of cases){
 const compiled=read(resolve(OUT,c.promptFile));check(hash(compiled)===c.compiledHash,'compiled_changed:'+c.id);
 check(hash(readFileSync(resolve(OUT,'prompts',c.id+'.txt')))===c.promptHash,'prompt_changed:'+c.id);
 compiled.referenceDescriptors.forEach(r=>{try{verifyReference(r);}catch{errors.push('reference_changed:'+r.id);}});
}
for(const e of state.entries){
 const c=cases.find(c=>c.id===e.caseId);check(!!c&&c.promptHash===e.promptHash&&c.configHash===e.configHash,'entry_lineage:'+e.caseId);
 if(e.status==='succeeded')check(hash(readFileSync(resolve(OUT,e.output)))===e.outputHash,'output_changed:'+e.caseId);
 if(e.audit)check(e.audit.outputHash===e.outputHash&&e.audit.rubricHash===campaign.rubricHash,'audit_lineage:'+e.caseId);
}
const old=read(resolve(ROOT,'reviews/2026-09-06-prompt-system/proof-packet.json')).fileManifest;
for(const[f,h]of Object.entries(old))check(hash(readFileSync(resolve(ROOT,f)))===h,'v1_changed:'+f);
const result={passed:!errors.length,compiledCasesChecked:cases.length,originalOutputsChecked:state.entries.filter(e=>e.status==='succeeded').length,auditsChecked:state.entries.filter(e=>e.audit).length,v1FilesPreserved:Object.keys(old).length,errors};
writeFileSync(resolve(OUT,'artifact-verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(errors.length)process.exitCode=1;
