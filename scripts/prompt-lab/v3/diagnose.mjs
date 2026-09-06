import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sha} from './identity.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const old=resolve(root,'reviews/2026-09-06-creative-name-v2');
const out=resolve(root,'reviews/2026-09-06-arabic-v3-inputs');
const read=name=>JSON.parse(readFileSync(resolve(old,name)));
const ledger=read('ledger.json'),cases=read('cases.json'),refs=read('references/manifest.json').references;
const arabic=ledger.entries.filter(e=>e.name&&/\p{Script=Arabic}/u.test(e.name));
const verdict=e=>Object.values(e.audit.gates).includes('reject')?'reject':Object.values(e.audit.gates).some(g=>g!=='pass')?'uncertain':'pass';
const aggregate=entries=>({total:entries.length,pass:entries.filter(e=>verdict(e)==='pass').length,reject:entries.filter(e=>verdict(e)==='reject').length,uncertain:entries.filter(e=>verdict(e)==='uncertain').length,gates:Object.fromEntries(Object.keys(entries[0].audit.gates).map(g=>[g,{pass:entries.filter(e=>e.audit.gates[g]==='pass').length,reject:entries.filter(e=>e.audit.gates[g]==='reject').length,uncertain:entries.filter(e=>e.audit.gates[g]==='needs_review').length}]))});
const bindings=cases.map(c=>{
 const p=read(c.promptFile);
 return {caseId:c.id,name:p.config.name,referenceChecks:p.referenceDescriptors.map(r=>{
  const frozen=refs.find(f=>f.id===r.id);
  return {id:r.id,hashMatches:frozen.sha256===r.sha256,customerMatches:r.role!=='spelling'||(frozen.words.length===1&&frozen.words[0]===p.config.name),scriptMatches:r.role==='hardware'||frozen.script===p.config.script};
 })};
});
const result={sourceLedgerHash:sha(readFileSync(resolve(old,'ledger.json'))),arabic:aggregate(arabic),byName:Object.fromEntries(['ليان','نور','إيمان'].map(n=>[n,aggregate(arabic.filter(e=>e.name===n))])),byMethod:Object.fromEntries(['text','style','style_hardware','style_hardware_spelling'].map(m=>[m,aggregate(arabic.filter(e=>e.method===m))])),referenceBindingChecks:bindings,allFrozenBindingsCorrect:bindings.every(b=>b.referenceChecks.every(r=>r.hashMatches&&r.customerMatches&&r.scriptMatches)),providerCalls:0,causalConclusion:'Observed defects and input omissions; no unique failure cause is established. Input methods changed prompt text and references together. Two outputs per name/method cell cannot establish general reliability.'};
writeFileSync(resolve(out,'diagnosis.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({arabic:result.arabic,allFrozenBindingsCorrect:result.allFrozenBindingsCorrect}));
