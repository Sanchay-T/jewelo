import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,basename} from 'node:path';
import {OUT,read} from './prepare.mjs';
import {hash} from './compiler.mjs';
import {transact,recordAudit} from './ledger.mjs';
const source=process.argv[2],audits=JSON.parse(readFileSync(source,'utf8')),cases=read(resolve(OUT,'cases.json')),campaign=read(resolve(OUT,'campaign.json'));
mkdirSync(resolve(OUT,'audits'),{recursive:true});
const auditFile=resolve(OUT,'audits',basename(source));
if(existsSync(auditFile))throw Error('audit_source_already_imported');
const result=transact(resolve(OUT,'ledger.json'),state=>audits.map(a=>{
 const c=cases.find(c=>c.blindId===a.id);if(!c)throw Error('unknown_blind_id');
 const e=state.entries.find(e=>e.caseId===c.id);if(!e||e.outputHash!==a.outputHash)throw Error('blind_output_hash_mismatch');
 if(a.blinded!==true||!a.reviewer||!a.notes)throw Error('review_evidence_required');
 if(hash(readFileSync(resolve(OUT,e.output)))!==a.outputHash)throw Error('output_bytes_changed');
 recordAudit(state,e.key,{...a,rubricHash:campaign.rubricHash});return {id:a.id,gates:a.gates};
}));
writeFileSync(auditFile,JSON.stringify(audits,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
