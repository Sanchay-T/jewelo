import {readFileSync,existsSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {transact,reserve,submitted,finish,checkpoint,verifyPrompt} from './ledger.mjs';
import {hash} from './compiler.mjs';
const out='reviews/2026-09-06-prompt-system',path=join(out,'campaign.json');
const [command,arg]=process.argv.slice(2);
const data=arg?JSON.parse(arg):{};
let result;
if(command==='reserve'){
 const cases=JSON.parse(readFileSync(join(out,'screening-cases.json'),'utf8'));
 const c=cases.find(c=>c.id===data.id);if(!c)throw Error('unknown_case');
 const compiled=JSON.parse(readFileSync(join(out,c.compiledPath),'utf8'));
 // Verify actual immutable prompt and reference bytes, not just asserted metadata.
 verifyPrompt(compiled,readFileSync(join(out,c.promptPath),'utf8'));
 for(const ref of compiled.referenceDescriptors)if(hash(readFileSync(join(out,ref.path)))!==ref.sha256)throw Error('reference_bytes_changed');
 result=transact(path,s=>reserve(s,compiled,'screening',c.id,c.repeat));
}else if(command==='submitted'){
 result=transact(path,s=>{const e=s.entries.find(e=>e.caseId===data.id);if(!e)throw Error('unknown_case');submitted(e,data.result);return e;});
}else if(command==='finish'){
 result=transact(path,s=>{const e=s.entries.find(e=>e.caseId===data.id);if(!e)throw Error('unknown_case');
 const output=data.output;
 finish(e,{status:data.status,output,outputHash:output?hash(readFileSync(join(out,output))):null,error:data.error});return e;});
}else if(command==='checkpoint'){
 result=transact(path,s=>checkpoint(s,data));
}else if(command==='read'){
 result=JSON.parse(readFileSync(path,'utf8'));
}else throw Error('unknown_command');
console.log(JSON.stringify(result));
