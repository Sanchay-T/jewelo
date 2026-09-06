import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync,fsyncSync,renameSync,unlinkSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {hash} from '../compiler.mjs';

export const LIMITS=Object.freeze({screening:48,continuity:12,total:60,credits:2460,reservation:41,concurrency:2,checkpointEvery:20});
export const METHODS=Object.freeze(['text','style','style_hardware','style_hardware_spelling']);
export const HARD_GATES=Object.freeze(['identity','construction','attachments','selections','photography','unrequested_content','reference_leakage']);
export const ANCHOR_NAMES=Object.freeze(['ليان','إيمان','Lily','Christopher']);
const terminal=e=>['succeeded','failed'].includes(e.status);
const now=()=>new Date().toISOString();
const finite=n=>Number.isFinite(n)&&n>=0;
const text=s=>typeof s==='string'&&s.trim().length>0;
function verified(account){return account?.authenticated===true&&account.teamId===1068827&&finite(account.credits)&&account.unlimited===false;}
function entry(state,key){const e=state.entries.find(e=>e.key===key);if(!e)throw Error('unknown_entry');return e;}
function syncDirectory(path){const fd=openSync(dirname(path),'r');try{fsyncSync(fd);}finally{closeSync(fd);}}
function durableWrite(path,data,flags='wx'){
 const fd=openSync(path,flags,0o600);try{writeFileSync(fd,JSON.stringify(data,null,2)+'\n');fsyncSync(fd);}finally{closeSync(fd);}
}
export function initializeJournal(path,state){mkdirSync(dirname(path),{recursive:true});durableWrite(path,state);syncDirectory(path);return state;}
// Exclusive lock + fsynced replacement. A stale lock fails closed; it is never silently broken.
export function transact(path,mutate){
 const lock=openSync(path+'.lock','wx',0o600),tmp=path+'.'+randomUUID()+'.tmp';let created=false;
 try{
  const state=JSON.parse(readFileSync(path,'utf8')),result=mutate(state);
  if(result&&typeof result.then==='function')throw Error('transaction_must_be_synchronous');
  durableWrite(tmp,state);created=true;renameSync(tmp,path);created=false;syncDirectory(path);return result;
 }finally{if(created)unlinkSync(tmp);closeSync(lock);unlinkSync(path+'.lock');}
}
export function createState({account,policyChange}){
 if(!verified(account))throw Error('verified_finite_workspace_required');
 if(!text(policyChange))throw Error('explicit_policy_change_required');
 return {version:'creative-name-v2-ledger-1',createdAt:now(),limits:{...LIMITS},
  policy:{priorPrecautionaryBoundary:50,authorizedChange:policyChange,newSubmissionCap:60,providerQuotaResetEvidence:null},
  account:{...structuredClone(account),initialCredits:account.credits,checkedAtSubmission:0,checkedAt:now(),reportedBalanceFloor:account.credits},
  stageGates:{screening:true,continuity:false},entries:[],creditCheckpoints:[],debitExplanations:[],
  reconciledSpend:0,workspaceDebit:0,explainedExternalDebit:0,pauseReasons:[],selection:null,anchors:[]};
}
export function budgetStatus(state){
 const outstanding=state.entries.filter(e=>!e.creditReconciled);
 const reservedCredits=outstanding.reduce((n,e)=>n+Math.max(LIMITS.reservation,e.reportedDebit??0),0);
 const reconciledSpend=Math.max(state.reconciledSpend,state.entries.filter(e=>e.creditReconciled).reduce((n,e)=>n+(e.reportedDebit??0),0));
 const exposure=reconciledSpend+reservedCredits;
 return {reconciledSpend,reservedCredits,exposure,remainingBudget:LIMITS.credits-exposure,
  availableCredits:Math.min(state.account.credits,state.account.reportedBalanceFloor)-reservedCredits};
}
export function ready(state,stage='screening'){
 let reason=null;
 if(!verified(state.account))reason='workspace_not_verified';
 else if(!Object.hasOwn(LIMITS,stage)||!['screening','continuity'].includes(stage)||!state.stageGates[stage])reason='stage_not_open';
 else if(state.pauseReasons.length)reason='unexplained_debit_pause';
 else if(state.entries.some(e=>e.status==='unknown'))reason='reconcile_ambiguous_submission_first';
 else if(state.entries.filter(e=>['reserved','pending'].includes(e.status)).length>=LIMITS.concurrency)reason='concurrency_limit';
 else if(state.entries.length>=LIMITS.total||state.entries.filter(e=>e.stage===stage).length>=LIMITS[stage])reason='stage_budget_exhausted';
 else if(state.entries.length-state.account.checkedAtSubmission>=LIMITS.checkpointEvery)reason='credit_checkpoint_required';
 const budget=budgetStatus(state);
 if(!reason&&budget.exposure+LIMITS.reservation>LIMITS.credits)reason='credit_budget_exhausted';
 if(!reason&&budget.availableCredits<LIMITS.reservation)reason='insufficient_existing_credits';
 return {ready:reason===null,reason,...budget};
}
export function reserve(state,compiled,stage,caseId,repeat){
 if(!text(caseId)||!Number.isInteger(repeat)||repeat<1)throw Error('trial_identity_required');
 if(!compiled||!text(compiled.promptHash)||!text(compiled.configHash)||!text(compiled.recipeHash)||!text(compiled.view)||!text(compiled.method)||compiled.model!=='gpt-image-2')throw Error('compiled_identity_required');
 if(state.entries.some(e=>e.stage===stage&&e.caseId===caseId&&e.repeat===repeat&&e.view===compiled.view&&e.method===compiled.method))throw Error('duplicate_submission');
 const status=ready(state,stage);if(!status.ready)throw Error(status.reason);
 let anchor=null;
 if(stage==='screening'){
  if(!METHODS.includes(compiled.method)||compiled.view!=='Studio'||repeat>2)throw Error('invalid_screening_trial');
 }else{
  anchor=state.anchors.find(a=>a.caseId===compiled.anchor?.id&&a.outputHash===compiled.anchor?.outputHash);
  if(!anchor||anchor.configHash!==compiled.configHash||compiled.method!=='design_anchor'||!['On skin','Close-up','Dark'].includes(compiled.view)||repeat!==1)throw Error('approved_continuity_anchor_required');
  if(state.entries.some(e=>e.stage==='continuity'&&e.anchorHash===anchor.outputHash&&e.view===compiled.view))throw Error('duplicate_anchor_view');
 }
 const e={key:hash([stage,caseId,repeat,compiled.view,compiled.method]),caseId,repeat,stage,attempt:1,
  name:compiled.config?.name,view:compiled.view,method:compiled.method,model:compiled.model,ratio:compiled.ratio,
  promptHash:compiled.promptHash,configHash:compiled.configHash,recipeHash:compiled.recipeHash,
  referenceHashes:(compiled.referenceDescriptors??[]).map(r=>r.sha256),
  designId:anchor?.caseId??caseId,anchorHash:anchor?.outputHash??null,
  creditReservation:LIMITS.reservation,creditReconciled:false,status:'reserved',reservedAt:now()};
 state.entries.push(e);return e;
}
function pause(state,reason){if(!state.pauseReasons.includes(reason))state.pauseReasons.push(reason);}
const allowedDebit=()=>LIMITS.reservation;
const aggregateAllowance=state=>state.entries.reduce((n,e)=>n+allowedDebit(e),0);
export function submitted(state,key,result={}){
 const e=entry(state,key);if(e.status!=='reserved')throw Error('invalid_submission_transition');
 if(!text(result.taskId)){
  e.status='unknown';e.reason='No provider task ID; provider reconciliation required.';e.ambiguousAt=now();return e;
 }
 if(state.entries.some(other=>other!==e&&other.taskId===result.taskId)){
  e.status='unknown';e.reason='Provider task ID is already bound to another reservation.';e.ambiguousAt=now();return e;
 }
 e.taskId=result.taskId;e.status='pending';e.submittedAt=now();
 if(result.creditsRemaining!==undefined){
  if(!finite(result.creditsRemaining))pause(state,'invalid_reported_balance:'+key);
  else{e.balanceAfterSubmission=result.creditsRemaining;state.account.reportedBalanceFloor=Math.min(state.account.reportedBalanceFloor,result.creditsRemaining);}
 }
 if(result.creditsCharged!==undefined){
  if(!finite(result.creditsCharged))pause(state,'invalid_reported_debit:'+key);
  else{e.reportedDebit=result.creditsCharged;if(result.creditsCharged>LIMITS.reservation)pause(state,'per_task_debit_exceeds_reservation:'+key);}
 }
 return e;
}
export function finish(state,key,{status,output,outputHash,error}){
 const e=entry(state,key);
 if(e.status!=='pending'||!e.taskId)throw Error('reconciled_task_required');
 if(!['succeeded','failed'].includes(status))throw Error('invalid_terminal_status');
 if(status==='succeeded'&&(!text(output)||!text(outputHash)))throw Error('immutable_output_required');
 if(status==='succeeded'&&state.entries.some(o=>o!==e&&o.outputHash===outputHash))throw Error('reused_output_bytes');
 if(status==='failed'&&!text(error))throw Error('terminal_failure_reason_required');
 Object.assign(e,{status,output:output??null,outputHash:outputHash??null,error:error??null,finishedAt:now()});return e;
}
export function checkpoint(state,{teamId,credits,observation,externalDebit=0}){
 if(teamId!==1068827||teamId!==state.account.teamId||!finite(credits)||!text(observation)||!finite(externalDebit))throw Error('invalid_credit_checkpoint');
 if(state.entries.some(e=>['reserved','unknown'].includes(e.status)))throw Error('unresolved_reservation_at_checkpoint');
 const previous=state.account.credits,delta=previous-credits;
 const chargeKeys=state.entries.filter(e=>!e.creditReconciled).map(e=>e.key);
 const intervalAllowance=state.entries.filter(e=>!e.creditReconciled).reduce((n,e)=>n+allowedDebit(e),0);
 if(externalDebit>Math.max(0,delta))throw Error('external_debit_exceeds_workspace_delta');
 state.workspaceDebit+=Math.max(0,delta);state.explainedExternalDebit+=externalDebit;
 state.reconciledSpend+=Math.max(0,delta)-externalDebit;
 if(state.reconciledSpend>aggregateAllowance(state))pause(state,'aggregate_debit_exceeds_reservations');
 if(Math.max(0,delta)-externalDebit>intervalAllowance)pause(state,'checkpoint_debit_exceeds_reservations:'+state.creditCheckpoints.length);
 for(const e of state.entries)if(terminal(e))e.creditReconciled=true;
 const record={at:now(),submission:state.entries.length,previous,current:credits,workspaceDelta:delta,externalDebit,chargeKeys,intervalAllowance,observation,
  attribution:'Observed workspace debit, not a per-task invoice. External usage is excluded only with explicit explanation.'};
 state.creditCheckpoints.push(record);
 state.account={...state.account,credits,reportedBalanceFloor:credits,checkedAtSubmission:state.entries.length,checkedAt:record.at};
 if(budgetStatus(state).exposure>LIMITS.credits)pause(state,'campaign_credit_ceiling_exceeded');
 return record;
}
export function reconcile(state,key,evidence){
 if(!text(evidence?.observation))throw Error('reconciliation_observation_required');
 if(evidence.kind==='provider_task_found'){
  const e=entry(state,key);
  if(e.status!=='unknown'||!text(evidence.taskId)||state.entries.some(o=>o!==e&&o.taskId===evidence.taskId))throw Error('unique_provider_task_required');
  e.taskId=evidence.taskId;e.status='pending';e.submittedAt=evidence.submittedAt??e.ambiguousAt;
  e.reconciliation={...structuredClone(evidence),recordedAt:now()};return e;
 }
 if(evidence.kind!=='debit_explanation')throw Error('unsupported_reconciliation_kind');
 // An explanation documents observed charges; it never increases either authorization ceiling.
 const reason=evidence.reason;
 if(!state.pauseReasons.includes(reason))throw Error('existing_debit_pause_required');
 if(reason.startsWith('checkpoint_debit_exceeds_reservations:')){
  const record=state.creditCheckpoints[Number(reason.split(':').at(-1))];
  if(!record||!finite(evidence.externalDebit)||evidence.externalDebit>Math.max(0,record.workspaceDelta)-record.externalDebit||evidence.externalDebit>state.reconciledSpend)throw Error('valid_interval_debit_explanation_required');
  const allowance=state.entries.filter(e=>record.chargeKeys.includes(e.key)).reduce((n,e)=>n+allowedDebit(e),0);
  if(Math.max(0,record.workspaceDelta)-record.externalDebit-evidence.externalDebit>allowance)throw Error('interval_debit_still_unexplained');
  record.externalDebit+=evidence.externalDebit;state.explainedExternalDebit+=evidence.externalDebit;state.reconciledSpend-=evidence.externalDebit;
 }else if(reason==='aggregate_debit_exceeds_reservations'||reason==='campaign_credit_ceiling_exceeded'){
  if(evidence.externalDebit!==0)throw Error('attribute_external_debit_to_its_checkpoint_first');
 }else{
  const e=entry(state,key);if(!reason.endsWith(':'+e.key))throw Error('debit_explanation_entry_mismatch');
  if(reason.startsWith('per_task_debit_exceeds_reservation:'))throw Error('per_task_cost_exceeds_frozen_allowance');
  if(reason.startsWith('invalid_reported_'))throw Error('fresh_checkpoint_required_for_invalid_provider_report');
  e.debitExplanation=structuredClone(evidence);
 }
 state.debitExplanations.push({...structuredClone(evidence),entryKey:key??null,recordedAt:now()});
 state.pauseReasons=state.pauseReasons.filter(r=>r!==reason);
 if(state.reconciledSpend>aggregateAllowance(state))pause(state,'aggregate_debit_exceeds_reservations');
 if(budgetStatus(state).exposure>LIMITS.credits)pause(state,'campaign_credit_ceiling_exceeded');
 return {pauseReasons:[...state.pauseReasons],...budgetStatus(state)};
}
export function auditVerdict(e,audit,rubricHash){
 if(e?.status==='failed')return 'reject';
 if(e?.status!=='succeeded')return 'pending';
 if(!audit||audit.outputHash!==e.outputHash||audit.rubricHash!==rubricHash)return 'needs_review';
 const gates=HARD_GATES.map(g=>audit.gates?.[g]);
 if(gates.includes('reject'))return 'reject';
 return gates.every(g=>g==='pass')?'pass':'needs_review';
}
export function recordAudit(state,key,audit){
 const e=entry(state,key);
 if(e.status!=='succeeded'||audit?.outputHash!==e.outputHash||!text(audit.rubricHash))throw Error('audit_lineage_required');
 if(!Number.isInteger(audit.styleScore)||audit.styleScore<1||audit.styleScore>5||HARD_GATES.some(g=>!['pass','reject','needs_review'].includes(audit.gates?.[g])))throw Error('complete_audit_required');
 if(e.stage==='continuity'&&(audit.anchorHash!==e.anchorHash||!['pass','reject','needs_review'].includes(audit.sameDesign)))throw Error('continuity_audit_binding_required');
 if(e.audit)throw Error('audit_already_recorded');
 e.audit={...structuredClone(audit),recordedAt:now()};return e.audit;
}
const median=values=>{const a=[...values].sort((a,b)=>a-b),i=a.length/2;return a.length%2?a[Math.floor(i)]:(a[i-1]+a[i])/2;};
function selectionEvidence(state){return hash(state.entries.filter(e=>e.stage==='screening'));}
export function selectCandidate(state,cases,{rubricHash}){
 const entries=state.entries.filter(e=>e.stage==='screening');
 if(!text(rubricHash)||cases.length!==48||new Set(cases.map(c=>c.id)).size!==48||entries.length!==48||entries.some(e=>!terminal(e)))throw Error('48_terminal_screening_trials_required');
 if(state.account.checkedAtSubmission!==state.entries.length||state.entries.some(e=>!e.creditReconciled)||state.pauseReasons.length)throw Error('screening_end_checkpoint_required');
 for(const c of cases){
  const e=entries.find(e=>e.caseId===c.id);
  if(!e||c.method!==e.method||c.repeat!==e.repeat||(c.configHash&&c.configHash!==e.configHash))throw Error('screening_manifest_mismatch');
  if(e.status==='succeeded'&&(!e.audit||e.audit.rubricHash!==rubricHash||e.audit.outputHash!==e.outputHash||HARD_GATES.some(g=>!['pass','reject','needs_review'].includes(e.audit.gates?.[g]))||!Number.isInteger(e.audit.styleScore)))throw Error('all_successful_outputs_must_be_reviewed');
 }
 const methods=METHODS.map((method,referenceCount)=>{
  const group=entries.filter(e=>e.method===method),names=new Set(group.map(e=>e.name));
  if(group.length!==12||names.size!==6||[...names].some(name=>group.filter(e=>e.name===name).length!==2||![1,2].every(r=>group.some(e=>e.name===name&&e.repeat===r))))throw Error('balanced_six_name_screen_required');
  const eligible=group.every(e=>auditVerdict(e,e.audit,rubricHash)==='pass'&&e.audit.styleScore>=3&&e.audit.styleScore<=5);
  return {method,referenceCount,eligible,hardPasses:group.filter(e=>auditVerdict(e,e.audit,rubricHash)==='pass').length,medianStyle:group.every(e=>e.audit)?median(group.map(e=>e.audit.styleScore)):null};
 });
 const ranked=methods.filter(m=>m.eligible).sort((a,b)=>b.medianStyle-a.medianStyle||a.referenceCount-b.referenceCount),winner=ranked[0]?.method??null;
 const anchors=winner?ANCHOR_NAMES.map(name=>{
  const e=entries.find(e=>e.method===winner&&e.name===name&&e.repeat===1);
  if(!e)throw Error('fixed_first_repeat_anchor_missing');
  return {name,caseId:e.caseId,outputHash:e.outputHash,configHash:e.configHash,method:e.method};
 }):[];
 return {eligible:!!winner,winner,methods,anchors,rubricHash,evidenceHash:selectionEvidence(state),qualified:false};
}
export function openContinuity(state,selection,{anchors=selection.anchors}={}){
 if(state.stageGates.continuity)throw Error('continuity_already_open');
 if(!selection.eligible||!METHODS.includes(selection.winner)||selection.evidenceHash!==selectionEvidence(state)||hash(anchors)!==hash(selection.anchors)||anchors.length!==4)throw Error('eligible_unchanged_screening_selection_required');
 const current=selectCandidate(state,state.entries.filter(e=>e.stage==='screening').map(e=>({id:e.caseId,method:e.method,repeat:e.repeat,configHash:e.configHash})),{rubricHash:selection.rubricHash});
 if(hash(current)!==hash(selection))throw Error('selection_must_match_derived_result');
 if(state.pauseReasons.length||state.entries.some(e=>!terminal(e))||state.account.checkedAtSubmission!==48)throw Error('screening_end_checkpoint_required');
 state.selection=structuredClone(selection);state.anchors=structuredClone(anchors);state.stageGates.continuity=true;return state.anchors;
}
export function continuitySummary(state,{rubricHash}){
 const groups=state.anchors.map(anchor=>{
  const studio=state.entries.find(e=>e.caseId===anchor.caseId&&e.stage==='screening'),views=state.entries.filter(e=>e.stage==='continuity'&&e.anchorHash===anchor.outputHash);
  const pass=views.length===3&&['On skin','Close-up','Dark'].every(v=>views.some(e=>e.view===v))&&
   studio?.outputHash===anchor.outputHash&&auditVerdict(studio,studio.audit,rubricHash)==='pass'&&
   views.every(e=>e.configHash===anchor.configHash&&e.designId===anchor.caseId&&auditVerdict(e,e.audit,rubricHash)==='pass'&&e.audit.anchorHash===anchor.outputHash&&e.audit.sameDesign==='pass');
  return {anchor:anchor.caseId,name:anchor.name,pass};
 });
 const entries=state.entries.filter(e=>e.stage==='continuity');
 return {complete:groups.length===4&&entries.length===12&&entries.every(terminal)&&state.account.checkedAtSubmission===state.entries.length,
  passed:groups.filter(g=>g.pass).length,total:4,groups,qualified:false,scope:'Four-design continuity diagnostic only; no production or reliability qualification.'};
}
