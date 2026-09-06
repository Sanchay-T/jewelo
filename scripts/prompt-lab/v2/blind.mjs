import {mkdirSync,linkSync,existsSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {OUT,read} from './prepare.mjs';
const cases=read(resolve(OUT,'cases.json')),state=read(resolve(OUT,'ledger.json'));
mkdirSync(resolve(OUT,'blind'),{recursive:true});
const manifest=[];
for(const e of state.entries.filter(e=>e.status==='succeeded')){
 const c=cases.find(c=>c.id===e.caseId),path='blind/'+c.blindId+'.png';
 if(!existsSync(resolve(OUT,path)))linkSync(resolve(OUT,e.output),resolve(OUT,path));
 manifest.push({id:c.blindId,name:e.name,path,outputHash:e.outputHash,view:e.view,required:'Classical, Classic lettering, White gold, no stones, Cable chain, single name; nominal size not evaluated.'});
}
writeFileSync(resolve(OUT,'blind/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({blindOutputs:manifest.length}));
