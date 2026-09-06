import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {hash} from '../compiler.mjs';
import {LIMITS,METHODS,HARD_GATES,ANCHOR_NAMES,createState,initializeJournal,transact,budgetStatus,ready,reserve,submitted,finish,checkpoint,reconcile,recordAudit,selectCandidate,openContinuity,continuitySummary} from './ledger.mjs';

const rubricHash=hash('v2-test-rubric');
const names=['ليان','إيمان','أسماء','Lily','Christopher','Noor'];
const account={authenticated:true,teamId:1068827,unlimited:false,credits:100000};
const state=()=>createState({account,policyChange:'User explicitly replaced the precautionary 50-submission boundary with this 60-new-image experiment.'});
function compiled(name='Lily',method='text',view='Studio',anchor){
 return {config:{name},configHash:hash(name),recipeHash:hash('recipe'),promptHash:hash([name,method,view]),
  model:'gpt-image-2',method,view,ratio:'1:1',referenceDescriptors:[],...(anchor?{anchor}: {})};
}
function complete(s,e,{failed=false,debit=41}={}){
 submitted(s,e.key,{taskId:'task-'+e.caseId,creditsCharged:debit});
 finish(s,e.key,failed?{status:'failed',error:'Provider reported terminal failure.'}:{status:'succeeded',output:e.caseId+'.png',outputHash:hash('bytes-'+e.caseId)});
 return e;
}
function audit(s,e,styleScore=4,patch={}){
 return recordAudit(s,e.key,{outputHash:e.outputHash,rubricHash,styleScore,
  gates:Object.fromEntries(HARD_GATES.map(g=>[g,'pass'])),
  ...(e.stage==='continuity'?{sameDesign:'pass',anchorHash:e.anchorHash}:{}),...patch});
}
function check(s,credits=s.account.initialCredits-s.entries.reduce((n,e)=>n+(e.reportedDebit??0),0)){
 return checkpoint(s,{teamId:1068827,credits,observation:'Read-only workspace credit observation.'});
}
function screened(){
 const s=state(),cases=[];
 for(const method of METHODS)for(const name of names)for(const repeat of [1,2]){
  const c=compiled(name,method),id=method+'-'+name+'-'+repeat;
  const e=reserve(s,c,'screening',id,repeat);complete(s,e);audit(s,e);
  cases.push({id,method,repeat,configHash:c.configHash});
  if(s.entries.length%20===0)check(s);
 }
 check(s);return {s,cases};
}
function continued(s,limit=12,lastDebit=41){
 let n=0;
 for(const a of s.anchors)for(const view of ['On skin','Close-up','Dark']){
  if(n++>=limit)return;
  const c=compiled(a.name,'design_anchor',view,{id:a.caseId,outputHash:a.outputHash,configHash:a.configHash});
  const e=reserve(s,c,'continuity',a.caseId+'-'+view,1);complete(s,e,{debit:n===limit?lastDebit:41});audit(s,e);
 }
}
test('verified workspace and explicit policy replace a precaution without asserting a quota reset',()=>{
 for(const patch of [{teamId:7},{credits:Infinity},{credits:NaN},{credits:-1},{authenticated:false},{unlimited:true}])
  assert.throws(()=>createState({account:{...account,...patch},policyChange:'authorized'}),/workspace/);
 assert.throws(()=>createState({account,policyChange:''}),/policy_change/);
 const s=state();assert.equal(s.policy.providerQuotaResetEvidence,null);assert.equal(s.policy.newSubmissionCap,60);
 assert.equal(s.stageGates.continuity,false);assert(ready(s).ready);
});
test('atomic transaction persists once, rolls back exceptions, and fails closed on an existing lock',()=>{
 const dir=mkdtempSync(join(tmpdir(),'jewelo-v2-ledger-')),path=join(dir,'campaign.json');
 try{
  initializeJournal(path,state());assert.throws(()=>initializeJournal(path,state()),/EEXIST/);
  transact(path,s=>reserve(s,compiled(),'screening','one',1));
  const saved=readFileSync(path,'utf8');assert.equal(JSON.parse(saved).entries.length,1);
  assert.throws(()=>transact(path,s=>{s.entries=[];throw Error('injected');}),/injected/);
  assert.equal(readFileSync(path,'utf8'),saved);
  writeFileSync(path+'.lock','test lock');assert.throws(()=>transact(path,()=>{}),/EEXIST/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('duplicate trial rejects changed prompts and max two active reservations is enforced',()=>{
 const s=state(),c=compiled();reserve(s,c,'screening','one',1);
 assert.throws(()=>reserve(s,{...c,promptHash:hash('changed')},'screening','one',1),/duplicate/);
 reserve(s,c,'screening','two',1);
 assert.throws(()=>reserve(s,c,'screening','three',1),/concurrency/);
 assert.throws(()=>reserve(state(),c,'continuity','wrong-stage',1),/stage_not_open/);
});
test('uncertain submission blocks all new work and cannot be cleared by timeout failure',()=>{
 const s=state(),e=reserve(s,compiled(),'screening','one',1);submitted(s,e.key,{});
 assert.equal(e.status,'unknown');assert.equal(ready(s).reason,'reconcile_ambiguous_submission_first');
 assert.throws(()=>finish(s,e.key,{status:'failed',error:'Timeout'}),/reconciled/);
 assert.throws(()=>reserve(s,compiled(),'screening','other',1),/ambiguous/);
 assert.throws(()=>reconcile(s,e.key,{kind:'provider_task_found',taskId:'found'}),/observation/);
 reconcile(s,e.key,{kind:'provider_task_found',taskId:'found',observation:'Provider readback located the original paid task.'});
 finish(s,e.key,{status:'failed',error:'Provider returned terminal failure.'});
 assert.throws(()=>reserve(s,compiled(),'screening','one',1),/duplicate/);
 assert.equal(s.entries.length,1);
});
test('a reused provider task ID creates ambiguity instead of pretending a second unique paid result',()=>{
 const s=state(),a=reserve(s,compiled(),'screening','a',1),b=reserve(s,compiled(),'screening','b',1);
 submitted(s,a.key,{taskId:'same'});submitted(s,b.key,{taskId:'same'});
 assert.equal(b.status,'unknown');assert.throws(()=>reconcile(s,b.key,{kind:'provider_task_found',taskId:'same',observation:'Found it.'}),/unique/);
 assert.throws(()=>checkpoint(s,{teamId:1068827,credits:99959,observation:'Balance read.'}),/unresolved/);
});
test('pending reservations survive checkpoints and reserve exposure includes reconciled spend',()=>{
 const s=state(),a=reserve(s,compiled(),'screening','a',1),b=reserve(s,compiled(),'screening','b',1);
 submitted(s,a.key,{taskId:'a',creditsCharged:41});submitted(s,b.key,{taskId:'b',creditsCharged:41});
 finish(s,a.key,{status:'failed',error:'Terminal failed task.'});check(s,99918);
 assert.equal(a.creditReconciled,true);assert.equal(b.creditReconciled,false);
 assert.equal(budgetStatus(s).reconciledSpend,82);assert.equal(budgetStatus(s).reservedCredits,41);assert.equal(budgetStatus(s).exposure,123);
 finish(s,b.key,{status:'failed',error:'Terminal failed task.'});assert.equal(budgetStatus(s).reservedCredits,41);
 check(s,99918);assert.equal(budgetStatus(s).exposure,82);
});
test('checkpoint cannot erase an unsubmitted reservation; reported zero balance blocks spending',()=>{
 const s=state(),e=reserve(s,compiled(),'screening','a',1);
 assert.throws(()=>check(s),/unresolved/);
 submitted(s,e.key,{taskId:'a',creditsRemaining:0});finish(s,e.key,{status:'failed',error:'Terminal failure.'});
 assert.equal(ready(s).reason,'insufficient_existing_credits');
});
test('confirmed task debit over 41 cannot be cleared; unrelated workspace debits require evidence',()=>{
 const s=state(),e=reserve(s,compiled(),'screening','a',1);complete(s,e,{debit:42});
 assert.equal(ready(s).reason,'unexplained_debit_pause');
 const reason=s.pauseReasons[0];assert.throws(()=>reconcile(s,e.key,{kind:'debit_explanation',reason,observation:'Provider invoice confirms the 42-credit debit.'}),/frozen_allowance/);
 assert.equal(budgetStatus(s).reservedCredits,42);
 const separate=state();complete(separate,reserve(separate,compiled(),'screening','one',1));
 check(separate,99900);assert(separate.pauseReasons.includes('aggregate_debit_exceeds_reservations'));
 reconcile(separate,null,{kind:'debit_explanation',reason:'checkpoint_debit_exceeds_reservations:0',externalDebit:59,observation:'Workspace owner reconciled 59 credits to an unrelated recorded task.'});
 reconcile(separate,null,{kind:'debit_explanation',reason:'aggregate_debit_exceeds_reservations',externalDebit:0,observation:'The preceding checkpoint-specific explanation resolves this aggregate pause.'});
 assert.equal(budgetStatus(separate).reconciledSpend,41);assert.equal(separate.pauseReasons.length,0);assert.equal(s.limits.credits,2460);
});
test('checkpoints are mandatory after 20 submissions and screening endpoint',()=>{
 const s=state();for(let i=0;i<20;i++)complete(s,reserve(s,compiled(),'screening','c'+i,1));
 assert.throws(()=>reserve(s,compiled(),'screening','21',1),/checkpoint/);check(s);
 assert(ready(s).ready);
 const {s:full,cases}=screened();full.account.checkedAtSubmission=40;
 assert.throws(()=>selectCandidate(full,cases,{rubricHash}),/end_checkpoint/);
});
test('selection requires 12 of 12 hard passes, every style score at least 3, then median and fewer references',()=>{
 const {s,cases}=screened();const selection=selectCandidate(s,cases,{rubricHash});
 assert.equal(selection.winner,'text');assert.deepEqual(selection.anchors.map(a=>a.name),ANCHOR_NAMES);
 assert(selection.anchors.every(a=>s.entries.find(e=>e.caseId===a.caseId).repeat===1));
 s.entries.find(e=>e.method==='text').audit.gates.reference_leakage='needs_review';
 assert.equal(selectCandidate(s,cases,{rubricHash}).winner,'style');
 s.entries.find(e=>e.method==='style').audit.styleScore=2;
 assert.equal(selectCandidate(s,cases,{rubricHash}).winner,'style_hardware');
 for(const e of s.entries.filter(e=>e.method==='style_hardware_spelling'))e.audit.styleScore=5;
 assert.equal(selectCandidate(s,cases,{rubricHash}).winner,'style_hardware_spelling');
 s.entries[0].audit.outputHash='wrong';assert.throws(()=>selectCandidate(s,cases,{rubricHash}),/reviewed/);
});
test('selection rejects incomplete, reused-manifest, unreviewed, and forged winning evidence',()=>{
 const {s,cases}=screened();assert.throws(()=>selectCandidate(s,cases.slice(1),{rubricHash}),/48_terminal/);
 assert.throws(()=>selectCandidate(s,[...cases.slice(1),cases[1]],{rubricHash}),/48_terminal/);
 const selection=selectCandidate(s,cases,{rubricHash});
 assert.throws(()=>openContinuity(s,{...selection,winner:'style'}),/derived_result/);
 delete s.entries[0].audit;assert.throws(()=>selectCandidate(s,cases,{rubricHash}),/reviewed/);
 assert.throws(()=>openContinuity(s,selection),/unchanged/);
});
test('audit is bound to original bytes and rubric, includes leakage and style score, and is immutable',()=>{
 const s=state(),e=complete(s,reserve(s,compiled(),'screening','one',1));
 assert.throws(()=>audit(s,e,6),/complete_audit/);
 assert.throws(()=>audit(s,e,4,{outputHash:'different'}),/lineage/);
 assert.throws(()=>audit(s,e,4,{gates:{identity:'pass'}}),/complete_audit/);
 audit(s,e);assert.throws(()=>audit(s,e),/already_recorded/);
});
test('continuity binds each fixed first repetition anchor and caps the whole new campaign at 60',()=>{
 const {s,cases}=screened(),selection=selectCandidate(s,cases,{rubricHash});openContinuity(s,selection);
 const a=s.anchors[0],bad=compiled(a.name,'design_anchor','Dark',{id:a.caseId,outputHash:'wrong'});
 assert.throws(()=>reserve(s,bad,'continuity','bad',1),/anchor/);
 continued(s);assert.equal(s.entries.length,60);assert.equal(continuitySummary(s,{rubricHash}).complete,false);
 assert.throws(()=>reserve(s,compiled(),'screening','extra',1),/budget/);check(s);
 const summary=continuitySummary(s,{rubricHash});assert.equal(summary.complete,true);assert.equal(summary.passed,4);assert.equal(summary.qualified,false);
 assert.equal(budgetStatus(s).exposure,2460);
});
test('actual excess debit can exhaust 2460 credits before the 60-submission ceiling',()=>{
 const {s,cases}=screened();openContinuity(s,selectCandidate(s,cases,{rubricHash}));continued(s,11,42);
 // The hard cost stop remains in place; the extra observed debit also exhausts the budget for another reservation.
 check(s,s.account.initialCredits-59*41-1);
 assert.equal(s.entries.length,59);assert.equal(budgetStatus(s).exposure,2420);
 assert.equal(budgetStatus(s).remainingBudget,40);assert.equal(ready(s,'continuity').ready,false);
 assert.equal(LIMITS.total,60);
});
test('cheap earlier intervals cannot mask an unexplained expensive later interval',()=>{
 const s=state();
 for(let i=0;i<20;i++)complete(s,reserve(s,compiled(),'screening','cheap'+i,1),{debit:20});
 check(s,99600);complete(s,reserve(s,compiled(),'screening','later',1),{debit:20});
 check(s,99520); // 80 workspace credits in a one-reservation interval, despite cumulative spend <21*41.
 assert.equal(s.reconciledSpend,480);assert(s.pauseReasons.includes('checkpoint_debit_exceeds_reservations:1'));
 assert.equal(ready(s).reason,'unexplained_debit_pause');
 assert.throws(()=>reconcile(s,null,{kind:'debit_explanation',reason:'checkpoint_debit_exceeds_reservations:1',externalDebit:0,observation:'No actual explanation.'}),/still_unexplained/);
});
