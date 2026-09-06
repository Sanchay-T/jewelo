import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {analyzeArabic,sha,PROFILE,MARK_PROFILE_HASH} from './identity.mjs';
import {compileCandidate,METHODS,verifyPacket,TEMPLATE} from './compiler.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const out=resolve(root,'reviews/2026-09-06-arabic-v3-inputs');
mkdirSync(out,{recursive:true});
const write=(name,value)=>writeFileSync(resolve(out,name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
const identities=['ليان','نور','إيمان'].map(analyzeArabic);
write('identities.json',identities);
if(!existsSync(resolve(out,'reference-manifest.json'))){
  const run=spawnSync('python3',[resolve(root,'scripts/prompt-lab/v3/references.py')],{encoding:'utf8'});
  if(run.status)throw Error(run.stderr||run.stdout);
}
const manifest=JSON.parse(readFileSync(resolve(out,'reference-manifest.json')));
mkdirSync(resolve(out,'requests'),{recursive:true});
const requests=[];
for(const identity of identities)for(const method of METHODS){
  const refs=[manifest.references.find(r=>r.identityHash===identity.identityHash),...(method==='name_and_construction'?[manifest.references.find(r=>r.role==='construction')]:[])];
  const packet=compileCandidate({name:identity.rawName},{method,references:refs});
  verifyPacket(packet,out,{requireReview:manifest.status==='pass'});
  const stem='requests/'+identity.identityHash.slice(0,16)+'-'+method;
  write(stem+'.json',packet);write(stem+'.txt',packet.prompt);
  requests.push({name:identity.identity.name,method,path:stem+'.json',promptPath:stem+'.txt',packetHash:sha(packet),promptHash:packet.promptHash,characters:packet.prompt.length});
}
write('candidate-index.json',{status:'local_input_candidate_no_model_outputs',paidCalls:0,productionApproved:false,profile:PROFILE.version,markProfileHash:MARK_PROFILE_HASH,requests});
write('master-template.txt',TEMPLATE);
console.log(JSON.stringify({requests:requests.length,characters:requests.map(r=>r.characters),preflight:manifest.status,paidCalls:0}));
