import test from 'node:test';
import assert from 'node:assert/strict';
import {compile,normalize,hash,TEMPLATE,substitute,OPTIONS} from './compiler.mjs';
import {reserve,submitted,finish,requestPass,qualificationCriteria as qualify,reconcile,auditVerdict,imageVerdict,checkpoint,verifyPrompt} from './ledger.mjs';
import {developmentMatrix,holdout} from './matrix.mjs';
const d={name:'محمد',secondName:'نور',twoNames:false,script:'Arabic',construction:'Classical',lettering:'Classic',layout:'Connected heart',metal:'White gold',coverage:'No stones',gem:'Ruby',size:32,chain:'Cable',engraving:'',requests:''};
const recipe=()=>({configHash:hash(normalize(d)),status:'preflight_pass',geometryHash:'g',bodyHash:'b',assemblyHash:'a',attachment:'Use existing eyelets and separate rings.',invariants:'Preserve spelling.'});
const result=()=>compile(d,{recipe:recipe(),method:'text'});
test('inactive gem, layout and second name do not leak; input snapshot is immutable',()=>{
  const c=result();assert(!c.prompt.includes('Ruby'));assert(!c.prompt.includes('نور'));assert(!c.prompt.includes('heart'));
  assert.equal(d.gem,'Ruby');assert(Object.isFrozen(c.config));
});
test('literal substitutions do not interpret replacement tokens',()=>{
  const c=result(),s={...c.slots,metal_and_finish:'literal $& $1 $$'};
  assert(substitute(TEMPLATE,s).includes('literal $& $1 $$'));
});
test('unresolved/malformed/unknown placeholders fail before provider',()=>{
  const s=result().slots;
  for(const t of [TEMPLATE+' {oops}',TEMPLATE+' {{unknown}}',TEMPLATE.replace('{{view_recipe}}','')])assert.throws(()=>substitute(t,s));
  assert.throws(()=>substitute(TEMPLATE,{...s,name_and_script:'{{nested}}'}));
});
test('script, units, extra fields, raw requests and missing names rejected',()=>{
  for(const p of [{name:''},{name:'Alex'},{size:45},{requests:'add emeralds'},{length:45},{twoNames:'false'},{chain:'Alien'}])
    assert.throws(()=>compile({...d,...p},{recipe:recipe(),method:'text'}));
});
test('names NFC normalized, second name required only when active',()=>{
  assert.equal(normalize({...d,name:'ا\u0654سماء'}).name,'أسماء');
  assert.throws(()=>normalize({...d,twoNames:true,secondName:''}));
  assert.throws(()=>normalize({...d,name:'محمد@assembly'}));
});
test('paid compilation requires matching approved recipe and reference bytes',()=>{
  assert.throws(()=>compile(d,{recipe:{...recipe(),status:'pending'},method:'text'}));
  assert.throws(()=>compile(d,{recipe:{...recipe(),configHash:'wrong'},method:'text'}));
  assert.throws(()=>compile(d,{recipe:recipe(),method:'body',references:[{tag:'assembly',sha256:'a'}]}));
  assert.throws(()=>compile(d,{recipe:recipe(),method:'body',references:[{tag:'geometry',sha256:'wrong'}]}));
  assert(compile(d,{recipe:recipe(),method:'assembly',references:[{tag:'assembly',sha256:'a'}]}).prompt.includes('@assembly'));
});
test('selected stones require an actual placement map',()=>{
  const input={...d,coverage:'Accent'};
  assert.throws(()=>compile(input,{recipe:{...recipe(),configHash:hash(normalize(input))},method:'text'}),/stone_map/);
});
const state=()=>({entries:[],stageGates:{screening:true},account:{authenticated:true,teamId:1068827,unlimited:false,credits:308802,checkedAtSubmission:0},quotaBoundary:50,quotaResetEvidence:null,perImageCreditReservation:41});
test('ledger protects concurrency, duplicates and unknown submissions',()=>{
  const s=state(),c=result(),a=reserve(s,c,'screening','C1',1);
  assert.throws(()=>reserve(s,c,'screening','C1',1),/duplicate/);
  submitted(a,{});assert.throws(()=>reserve(s,c,'screening','C1',2),/ambiguous/);
  a.status='pending';a.taskId='t1';reserve(s,c,'screening','C1',2);
  assert.throws(()=>reserve(s,c,'screening','C1',3),/concurrency/);
  assert.throws(()=>finish(a,{status:'succeeded'}),/immutable/);
  finish(a,{status:'failed',error:'provider error'});
  assert.equal(a.status,'failed');
});
test('ledger enforces stage gate, credit checkpoint, quota, and existing balance',()=>{
  const c=result();assert.throws(()=>reserve(state(),c,'development','D1',1),/stage_not_open/);
  const s=state();s.account.credits=0;assert.throws(()=>reserve(s,c,'screening','C1',1),/credits/);
  s.account.credits=308802;s.entries=Array.from({length:20},(_,i)=>({key:''+i,stage:'screening',status:'failed'}));
  assert.throws(()=>reserve(s,c,'screening','C1',1),/checkpoint/);
  s.entries=Array.from({length:50},(_,i)=>({key:''+i,stage:'other',status:'failed'}));s.account.checkedAtSubmission=50;
  assert.throws(()=>reserve(s,c,'screening','C1',1),/quota/);
});
function qualificationFixture() {
  const rubricHash=hash('rubric'),releaseHash=hash('release');
  const qs=Array.from({length:400},(_,i)=>({id:'Q'+i,outputs:['Studio','On skin','Close-up','Dark'].map((view,j)=>({
    view,method:'assembly',configHash:hash('config'+i),releaseHash,taskId:'task'+i+'-'+j,outputHash:hash('bytes'+i+'-'+j),attempt:1,status:'succeeded',
    audit:{outputHash:hash('bytes'+i+'-'+j),rubricHash,verdict:'pass',crossView:'pass',referenceFidelity:'pass',
      gates:Object.fromEntries(['identity','construction','attachments','selections','photography','unrequested_content'].map(g=>[g,'pass']))}
  }))}));
  const expectedCases=qs.map(q=>({id:q.id,configHash:q.outputs[0].configHash}));
  return {qs,protocol:{releaseHash,rubricHash,expectedCases,samplingHash:hash(expectedCases),holdoutSealedAt:'2026-09-06',
    development:{passed:256,total:256,releaseHash},regression:{passed:16,total:16,releaseHash}}};
}
test('four correlated views count as ONE complete request with bound audits',()=>{
  const {qs,protocol}=qualificationFixture(),outputs=qs[0].outputs;
  assert(requestPass(outputs,protocol.rubricHash));assert(!requestPass(outputs.slice(1),protocol.rubricHash));
  assert(qualify(qs,protocol).qualified);
  assert(Math.abs(qualify(qs,protocol).lower95-.992539)<.000001);
  assert(!qualify(qs.slice(1),protocol).qualified);
  assert(!qualify(qs.map((q,i)=>i===0?{...q,outputs:[]}:q),protocol).qualified);
});
test('qualification rejects reused evidence, altered gates and unsealed configuration membership',()=>{
  const {qs,protocol}=qualificationFixture();
  assert(!qualify(qs.map(q=>({...q,outputs:qs[0].outputs})),protocol).qualified);
  const changed=structuredClone(qs);changed[0].outputs[0].audit.gates.identity='reject';
  assert(!qualify(changed,protocol).qualified);
  assert.throws(()=>qualify(qs,{...protocol,samplingHash:'fake'}),/sealed/);
  assert.throws(()=>qualify(qs,{...protocol,regression:{total:16,passed:15}}),/prerequisites/);
  const missing=structuredClone(qs);delete missing[0].outputs[0].audit.gates.identity;
  assert(!qualify(missing,protocol).qualified);
});
test('uncertain submission cannot be cleared by declaring a timeout failed',()=>{
  const s=state(),e=reserve(s,result(),'screening','c',1);submitted(e,{});
  assert.throws(()=>finish(e,{status:'failed',error:'timeout'}),/reconciled/);
  assert.throws(()=>reserve(s,result(),'screening','c',2),/ambiguous/);
  reconcile(e,{kind:'provider_task_found',taskId:'actual-task',observation:'Read-only provider lookup established the original task'});
  finish(e,{status:'failed',error:'provider reported terminal failure'});
  assert.equal(e.status,'failed');
});
test('reported zero credits and uncheckpointed completed charges block extra spending',()=>{
  const s=state();s.account.credits=41;
  const e=reserve(s,result(),'screening','c',1);submitted(e,{taskId:'t',creditsRemaining:0});
  finish(e,{status:'failed',error:'failed'});
  assert.throws(()=>reserve(s,result(),'screening','c',2),/credits/);
});
test('gallery verdict cannot override failure or mismatch immutable output',()=>{
  assert.equal(auditVerdict({status:'failed'},{verdict:'pass'},'r'),'reject');
  assert.equal(auditVerdict({status:'succeeded',outputHash:'x'},{verdict:'pass',outputHash:'y',rubricHash:'r'},'r'),'needs_review');
});
test('holdout is reproducible, independent and disjoint from development names',()=>{
  assert.throws(()=>holdout(1,{}),/freeze/);
  const p={releaseHash:'r',rubricHash:'q'},q=holdout(991,p);
  assert.equal(q.cases.length,400);assert.deepEqual(q,holdout(991,p));
  assert(q.cases.every(x=>!['محمد','Lia','Alexandra','أسماء'].includes(x.config.name)));
});
test('changing prompt text does not reopen an already submitted trial identity',()=>{
 const s=state(),c=result();reserve(s,c,'screening','same-case',1);
 assert.throws(()=>reserve(s,{...c,promptHash:'changed'},'screening','same-case',1),/duplicate/);
});
test('reference drift or missing fidelity review prevents complete-request success',()=>{
 const {qs,protocol}=qualificationFixture();
 const e=qs[0].outputs[0];e.audit.referenceFidelity='reject';
 assert.equal(auditVerdict(e,e.audit,protocol.rubricHash),'pass');
 assert.equal(imageVerdict(e,e.audit,protocol.rubricHash),'reject');
 assert(!qualify(qs,protocol).qualified);
 delete e.audit.referenceFidelity;
 assert.equal(imageVerdict(e,e.audit,protocol.rubricHash),'needs_review');
 e.method='text';assert.equal(imageVerdict(e,e.audit,protocol.rubricHash),'pass');
});

test('credit checkpoints cannot discard an unsubmitted reservation',()=>{
 const s=state();s.creditCheckpoints=[];s.account.credits=41;
 reserve(s,result(),'screening','c',1);
 assert.throws(()=>checkpoint(s,{teamId:1068827,credits:41}),/unresolved_reservation/);
 assert.throws(()=>reserve(s,result(),'screening','c2',1),/credits/);
});
test('both submitted JSON prompt and saved text must match their frozen hash',()=>{
 const c=result();verifyPrompt(c,c.prompt);
 assert.throws(()=>verifyPrompt({...c,prompt:'changed'},c.prompt),/prompt_bytes/);
 assert.throws(()=>verifyPrompt(c,c.prompt+'changed'),/prompt_bytes/);
});
test('renaming task IDs cannot qualify reused image bytes',()=>{
 const {qs,protocol}=qualificationFixture();
 for(const r of qs)for(const o of r.outputs){o.outputHash='same-bytes';o.audit.outputHash='same-bytes';}
 assert(!qualify(qs,protocol).qualified);
});
test('qualification reads immutable files and binds the real ledger entry',async()=>{
 const {mkdtempSync,writeFileSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const {bindOutput}=await import('./qualification.mjs');
 const root=mkdtempSync(join(tmpdir(),'jewelo-qualification-test-'));
 try {
  const config=normalize({...d,name:'Amelia',script:'English'});
  const r={...recipe(),configHash:hash(config)};
  const c=compile(config,{recipe:r,method:'text'});
  const compiledBytes=JSON.stringify(c),rubricHash=hash('rubric'),outputBytes='synthetic test bytes';
  for(const [name,data]of Object.entries({'compiled.json':compiledBytes,'prompt.txt':c.prompt,'recipe.json':JSON.stringify(r),'original.png':outputBytes,'audit.json':JSON.stringify({outputHash:hash(outputBytes),rubricHash})}))writeFileSync(join(root,name),data);
  const e={...c,caseId:'Q1-Studio',stage:'qualification',attempt:1,taskId:'actual-recorded-task',status:'succeeded',output:'original.png',outputHash:hash(outputBytes)};
  const ledger={entries:[e]},descriptor={trialId:e.caseId,view:c.view,compiledPath:'compiled.json',compiledFileHash:hash(compiledBytes),promptPath:'prompt.txt',recipePath:'recipe.json',auditPath:'audit.json'},request={configHash:c.configHash};
  assert.equal(bindOutput(root,descriptor,request,'qualification',ledger,rubricHash,'release').taskId,e.taskId);
  assert.throws(()=>bindOutput(root,descriptor,request,'qualification',{entries:[]},rubricHash,'release'),/ledger_entry/);
  const failed={...e,status:'failed',output:null,outputHash:null};
  assert.equal(bindOutput(root,descriptor,request,'qualification',{entries:[failed]},rubricHash,'release').status,'failed');
  writeFileSync(join(root,'original.png'),'changed bytes');
  assert.throws(()=>bindOutput(root,descriptor,request,'qualification',ledger,rubricHash,'release'),/output_bytes/);
  writeFileSync(join(root,'original.png'),outputBytes);
  writeFileSync(join(root,'compiled.json'),JSON.stringify({...c,prompt:'rewritten'}));
  assert.throws(()=>bindOutput(root,descriptor,request,'qualification',ledger,rubricHash,'release'),/compiled_artifact/);
 } finally {rmSync(root,{recursive:true,force:true});}
});

test('development failures retain the denominator and can satisfy 99 percent',()=>{
 const {qs,protocol}=qualificationFixture();
 const requests=qs.slice(0,256);requests[0].outputs[0].status='failed';
 assert.equal(requests.filter(r=>requestPass(r.outputs,protocol.rubricHash)).length,255);
 assert(255/256>=.99);
});
test('development and adjudication must precede the qualification freeze',async()=>{
 const {validatePhaseOrder}=await import('./qualification.mjs');
 const before='2026-09-06T10:00:00Z',seal='2026-09-06T11:00:00Z',after='2026-09-06T12:00:00Z';
 const o={status:'succeeded',finishedAt:before,audit:{reviewedAt:before}};
 const b={development:[{outputs:[structuredClone(o)]}],regression:[{outputs:[structuredClone(o)]}],qualification:[{outputs:[{submittedAt:after}]}]};
 validatePhaseOrder(b,seal);
 b.regression[0].outputs[0].audit.adjudicatedAt=after;
 assert.throws(()=>validatePhaseOrder(b,seal),/prerequisites/);
 b.regression[0].outputs[0].audit.adjudicatedAt=before;b.qualification[0].outputs[0].submittedAt=before;
 assert.throws(()=>validatePhaseOrder(b,seal),/started_before/);
});
test('definite reference drift rejects an image even when another gate is uncertain',()=>{
 const {qs,protocol}=qualificationFixture();const e=qs[0].outputs[0];
 e.audit.gates.attachments='needs_review';e.audit.referenceFidelity='reject';
 assert.equal(auditVerdict(e,e.audit,protocol.rubricHash),'needs_review');
 assert.equal(imageVerdict(e,e.audit,protocol.rubricHash),'reject');
});
test('nonempty engraving cannot silently assume an unspecified surface',()=>{
 const input={...d,engraving:'Forever'},r={...recipe(),configHash:hash(normalize(input))};
 assert.throws(()=>compile(input,{recipe:r,method:'text'}),/engraving_surface/);
 assert(compile(input,{recipe:{...r,engravingSurface:'rear'},method:'text'}).prompt.includes('Rear-surface engraving only'));
});
test('repeated placeholders receive the identical frozen value',()=>{
 const c=result(),p=substitute(TEMPLATE+'\n{{selected_size}}',c.slots);
 assert.equal(p.split(c.slots.selected_size).length-1,2);
});
