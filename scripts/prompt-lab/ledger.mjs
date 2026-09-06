import { readFileSync, writeFileSync, renameSync, mkdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { dirname } from 'node:path';
import { hash } from './compiler.mjs';
export const LIMITS = {screening:48, development:1024, ablation:96, regression:64, qualification:1600};
export function transact(path, mutate) {
  mkdirSync(dirname(path), {recursive:true});
  const lock = openSync(path + '.lock', 'wx');
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    const result = mutate(data);
    writeFileSync(path + '.tmp', JSON.stringify(data, null, 2) + '\n', {mode:0o600});
    renameSync(path + '.tmp', path);
    return result;
  } finally { closeSync(lock); unlinkSync(path + '.lock'); }
}
export function reserve(state, compiled, stage, caseId, repeat) {
  if (!Object.hasOwn(LIMITS, stage)) throw Error('unknown_stage');
  if (!state.stageGates[stage]) throw Error('stage_not_open');
  if (!state.account?.authenticated || state.account.teamId !== 1068827 || state.account.unlimited !== false) throw Error('workspace_not_verified');
  const entries = state.entries;
  const key = hash([stage,caseId,repeat,compiled.view,compiled.method,compiled.promptHash]);
  if (entries.some(e => e.key === key || (e.stage===stage && e.caseId===caseId && e.repeat===repeat && e.view===compiled.view && e.method===compiled.method))) throw Error('duplicate_submission');
  if (entries.some(e => e.status === 'unknown')) throw Error('reconcile_ambiguous_submission_first');
  if (entries.filter(e => ['reserved','pending'].includes(e.status)).length >= 2) throw Error('concurrency_limit');
  if (entries.length >= 2832 || entries.filter(e => e.stage === stage).length >= LIMITS[stage]) throw Error('stage_budget_exhausted');
  if (entries.length >= state.quotaBoundary && !state.quotaResetEvidence) throw Error('unverified_quota_boundary');
  if (entries.length - state.account.checkedAtSubmission >= 20) throw Error('credit_checkpoint_required');
  let available = state.account.credits;
  for (const e of entries.slice(state.account.checkedAtSubmission)) {
    available = Number.isFinite(e.balanceAfterSubmission)
      ? Math.min(available, e.balanceAfterSubmission)
      : available - e.creditReservation;
  }
  if (available < state.perImageCreditReservation) throw Error('insufficient_existing_credits');
  const entry = {key,caseId,repeat,stage,view:compiled.view,method:compiled.method,promptHash:compiled.promptHash,configHash:compiled.configHash,recipeHash:compiled.recipeHash,referenceHashes:(compiled.referenceDescriptors??[]).map(r=>r.sha256),model:compiled.model,ratio:compiled.ratio,attempt:1,creditReservation:state.perImageCreditReservation,status:'reserved',reservedAt:new Date().toISOString()};
  entries.push(entry);
  return entry;
}
export function submitted(entry, result) {
  if (entry.status !== 'reserved') throw Error('invalid_submission_transition');
  if (!result.taskId) {entry.status='unknown'; entry.reason='Missing task ID; reconcile before further calls'; return;}
  entry.taskId = result.taskId; entry.status='pending'; entry.submittedAt=new Date().toISOString();
  entry.balanceAfterSubmission = result.creditsRemaining ?? null;
}
export function checkpoint(state, data) {
  if (state.entries.some(e=>['reserved','unknown'].includes(e.status))) throw Error('unresolved_reservation_at_checkpoint');
  if (data.teamId!==state.account.teamId || !Number.isFinite(data.credits) || data.credits<0) throw Error('invalid_credit_checkpoint');
  const previous=state.account.credits;
  state.creditCheckpoints.push({at:new Date().toISOString(),submission:state.entries.length,previous,current:data.credits,workspaceDelta:previous-data.credits,attribution:'Workspace balance change, not a per-task invoice; concurrent account use may affect it.'});
  state.account={...state.account,credits:data.credits,checkedAtSubmission:state.entries.length,checkedAt:new Date().toISOString()};
  return state.account;
}
export function verifyPrompt(compiled, savedText) {
  if (hash(compiled.prompt)!==compiled.promptHash || compiled.prompt!==savedText || hash(savedText)!==compiled.promptHash) throw Error('prompt_bytes_changed');
}
export function finish(entry, {status, output, outputHash, error}) {
  if (entry.status !== 'pending' || !entry.taskId) throw Error('reconciled_task_required');
  if (!['succeeded','failed'].includes(status)) throw Error('invalid_terminal_status');
  if (status === 'succeeded' && (!output || !outputHash)) throw Error('immutable_output_required');
  Object.assign(entry, {status,output:output??null,outputHash:outputHash??null,error:error??null,finishedAt:new Date().toISOString()});
}
export const HARD_GATES = ['identity','construction','attachments','selections','photography','unrequested_content'];
export function auditVerdict(entry, audit, rubricHash) {
  if (entry?.status === 'failed') return 'reject';
  if (entry?.status !== 'succeeded') return 'pending';
  if (!audit || audit.outputHash !== entry.outputHash || audit.rubricHash !== rubricHash) return 'needs_review';
  const gates = HARD_GATES.map(g=>audit.gates?.[g]);
  if (gates.includes('reject')) return 'reject';
  return gates.every(g=>g==='pass') ? 'pass' : 'needs_review';
}
export function imageVerdict(entry, audit, rubricHash) {
  const semantic = auditVerdict(entry, audit, rubricHash);
  if (entry?.status==='succeeded' && ['body','assembly'].includes(entry.method) &&
      audit?.outputHash===entry.outputHash && audit?.rubricHash===rubricHash && audit.referenceFidelity==='reject') return 'reject';
  if (semantic !== 'pass') return semantic;
  if (!['text','body','assembly'].includes(entry.method)) return 'needs_review';
  if (entry.method === 'text') return 'pass';
  if (audit.referenceFidelity === 'reject') return 'reject';
  return audit.referenceFidelity === 'pass' ? 'pass' : 'needs_review';
}
export function reconcile(entry, evidence) {
  if (entry.status !== 'unknown' || evidence?.kind !== 'provider_task_found' || !evidence.taskId || !evidence.observation) throw Error('provider_reconciliation_evidence_required');
  entry.taskId=evidence.taskId;entry.reconciliation=structuredClone(evidence);entry.status='pending';
}
export function requestPass(outputs, rubricHash) {
  return typeof rubricHash==='string' && outputs.length === 4 &&
    ['Studio','On skin','Close-up','Dark'].every(v=>outputs.some(x=>x.view===v)) &&
    outputs.every(x=>x.configHash && x.releaseHash && x.taskId && x.outputHash && x.attempt===1) &&
    new Set(outputs.map(x=>x.taskId)).size===4 && new Set(outputs.map(x=>x.outputHash)).size===4 &&
    new Set(outputs.map(x=>x.configHash)).size === 1 &&
    new Set(outputs.map(x=>x.releaseHash)).size === 1 &&
    outputs.every(x=>imageVerdict(x,x.audit,rubricHash)==='pass' && x.audit.crossView==='pass');
}
// Statistical criteria are separate from the file-backed qualification entry point.
// This calculation is never sufficient evidence of a qualified package by itself.
export function qualificationCriteria(requests, frozen) {
  if (!frozen?.releaseHash || !frozen?.rubricHash || !frozen?.holdoutSealedAt ||
      !Array.isArray(frozen.expectedCases) || frozen.expectedCases.length!==400 ||
      frozen.samplingHash!==hash(frozen.expectedCases)) throw Error('sealed_holdout_required');
  if (!(frozen.development?.total>=256 && frozen.development.passed/frozen.development.total>=0.99 &&
       frozen.regression?.total===16 && frozen.regression.passed===16 &&
       frozen.development.releaseHash===frozen.releaseHash && frozen.regression.releaseHash===frozen.releaseHash))
       throw Error('qualification_prerequisites_not_met');
  const expected=new Map(frozen.expectedCases.map(c=>[c.id,c.configHash]));
  const ids = new Set(requests.map(r=>r.id));
  const outputRecords=requests.flatMap(r=>r.outputs);
  const distinctTasks=new Set(outputRecords.map(o=>o.taskId));
  const distinctImages=new Set(outputRecords.map(o=>o.outputHash));
  const membership=requests.every(r=>expected.has(r.id) && r.outputs.every(o=>o.configHash===expected.get(r.id)));
  const passed = requests.filter(r=>expected.has(r.id) &&
    r.outputs.every(o=>o.releaseHash===frozen.releaseHash && o.configHash===expected.get(r.id)) &&
    requestPass(r.outputs,frozen.rubricHash)).length;
  const complete=requests.length===400 && ids.size===400 && expected.size===400 &&
    membership && outputRecords.length===1600 && distinctTasks.size===1600 && distinctImages.size===1600;
  const qualified=complete && passed===400;
  return {complete,passed,total:requests.length,qualified,
    lower95:qualified?Math.pow(0.05,1/400):null,
    scope:'Runway MCP defined distribution; not production API or dimensional certification'};
}
