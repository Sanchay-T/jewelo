import {readFileSync,realpathSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {hash} from './compiler.mjs';
import {verifyPrompt,requestPass,qualificationCriteria} from './ledger.mjs';

const readJSON=path=>JSON.parse(readFileSync(path,'utf8'));
function local(root,path) {
 if(typeof path!=='string')throw Error('local_artifact_path_required');
 const base=realpathSync(root),target=realpathSync(resolve(base,path)),rel=relative(base,target);
 if(rel.startsWith('..')||isAbsolute(rel))throw Error('artifact_outside_campaign');
 return target;
}
// Read originals from disk and join them to the saved first-attempt ledger.
// A caller-supplied list of task IDs or aggregate pass counts is not accepted.
export function bindOutput(root,descriptor,request,stage,ledger,rubricHash,releaseHash) {
 const matches=ledger.entries.filter(e=>e.caseId===descriptor.trialId&&e.stage===stage);
 if(matches.length!==1)throw Error('first_attempt_ledger_entry_required');
 const e=matches[0];
 const compiledBytes=readFileSync(local(root,descriptor.compiledPath));
 if(hash(compiledBytes)!==descriptor.compiledFileHash)throw Error('frozen_compiled_artifact_changed');
 const c=JSON.parse(compiledBytes);
 verifyPrompt(c,readFileSync(local(root,descriptor.promptPath),'utf8'));
 if(c.configHash!==request.configHash || hash(c.config)!==request.configHash || c.view!==descriptor.view)throw Error('frozen_configuration_mismatch');
 for(const field of ['view','method','model','ratio','promptHash','configHash','recipeHash'])
  if(e[field]!==c[field])throw Error('ledger_compiled_mismatch:'+field);
 if(c.model!=='gpt-image-2')throw Error('wrong_provider_model');
 if(!['text','body','assembly'].includes(c.method))throw Error('reference_method_required');
 const expectedTag=c.method==='body'?'geometry':'assembly';
 if(c.referenceDescriptors.length!==(c.method==='text'?0:1)||c.referenceDescriptors.some(r=>r.tag!==expectedTag))throw Error('reference_role_mismatch');
 const recipe=readJSON(local(root,descriptor.recipePath));
 if(hash(recipe)!==c.recipeHash || recipe.status!=='preflight_pass'||recipe.configHash!==request.configHash)throw Error('approved_recipe_required');
 for(const ref of c.referenceDescriptors) {
  if(hash(readFileSync(local(root,ref.path)))!==ref.sha256)throw Error('reference_bytes_changed');
  if(ref.sha256!==recipe[c.method==='body'?'bodyHash':'assemblyHash'])throw Error('reference_recipe_mismatch');
 }
 if(e.attempt!==1||!e.taskId||!['succeeded','failed'].includes(e.status))throw Error('terminal_first_attempt_required');
 if(e.status==='failed')return {...e,releaseHash,audit:null};
 if(!e.outputHash)throw Error('original_output_required');
 if(hash(readFileSync(local(root,e.output)))!==e.outputHash)throw Error('original_output_bytes_changed');
 const audit=readJSON(local(root,descriptor.auditPath));
 if(audit.outputHash!==e.outputHash||audit.rubricHash!==rubricHash)throw Error('audit_lineage_mismatch');
 if(c.config.script==='Arabic' && !(audit.scriptReview?.status==='pass'&&audit.scriptReview?.reviewer&&audit.scriptReview?.competence==='Arabic reading and spelling')) {
  audit.gates={...audit.gates,identity:audit.gates?.identity==='reject'?'reject':'needs_review'};
  audit.qualificationHold='Competent Arabic reading/spelling review missing or not passing.';
 }
 return {...e,releaseHash,audit};
}
export function validatePhaseOrder(bound,sealedAt) {
 const seal=Date.parse(sealedAt);
 if(!Number.isFinite(seal))throw Error('valid_freeze_time_required');
 for(const stage of ['development','regression'])for(const r of bound[stage])for(const o of r.outputs) {
  const dates=[o.finishedAt];
  if(o.status==='succeeded')dates.push(o.audit?.reviewedAt,o.audit?.adjudicatedAt??o.audit?.reviewedAt,o.audit?.referenceReviewedAt??o.audit?.reviewedAt,o.audit?.scriptReview?.reviewedAt??o.audit?.reviewedAt);
  if(dates.some(d=>!Number.isFinite(Date.parse(d))||Date.parse(d)>seal))throw Error('prerequisites_not_complete_before_freeze');
 }
 for(const r of bound.qualification)for(const o of r.outputs)
  if(!Number.isFinite(Date.parse(o.submittedAt))||Date.parse(o.submittedAt)<=seal)throw Error('qualification_started_before_freeze');
}
export function qualifyFromFiles(root,protocolPath) {
 const protocol=readJSON(local(root,protocolPath));
 if(!protocol.release||hash(protocol.release)!==protocol.releaseHash||!Number.isFinite(Date.parse(protocol.sealedAt)))throw Error('frozen_release_required');
 const rubric=readJSON(local(root,protocol.rubricPath));
 if(hash(rubric)!==protocol.rubricHash)throw Error('frozen_rubric_changed');
 const study=readJSON(local(root,protocol.studyPath));
 if(hash(study)!==protocol.studyHash || protocol.release.studyHash!==protocol.studyHash || protocol.release.rubricHash!==protocol.rubricHash)throw Error('sealed_study_changed');
 if(study.development?.length!==256||study.regression?.length!==16||study.qualification?.length!==400)throw Error('complete_sealed_study_required');
 const ledger=readJSON(local(root,protocol.ledgerPath));
 const seenTasks=new Set(),seenOutputs=new Set();
 const bound={};
 for(const stage of ['development','regression','qualification']) {
  if(new Set(study[stage].map(r=>r.id)).size!==study[stage].length)throw Error('duplicate_request_id');
  bound[stage]=study[stage].map(r=>{
   if(r.outputs?.length!==4)throw Error('four_frozen_views_required');
   const outputs=r.outputs.map(d=>bindOutput(root,d,r,stage,ledger,protocol.rubricHash,protocol.releaseHash));
   for(const o of outputs) {
    if(seenTasks.has(o.taskId)||(o.outputHash&&seenOutputs.has(o.outputHash)))throw Error('reused_generation_evidence');
    seenTasks.add(o.taskId);if(o.outputHash)seenOutputs.add(o.outputHash);
    if(stage==='qualification'&&(!Number.isFinite(Date.parse(o.submittedAt))||Date.parse(o.submittedAt)<=Date.parse(protocol.sealedAt)))throw Error('qualification_started_before_freeze');
   }
   return {id:r.id,outputs};
  });
 }
 validatePhaseOrder(bound,protocol.sealedAt);
 const score=stage=>({total:bound[stage].length,passed:bound[stage].filter(r=>requestPass(r.outputs,protocol.rubricHash)).length,releaseHash:protocol.releaseHash});
 const expectedCases=study.qualification.map(r=>({id:r.id,configHash:r.configHash}));
 const result=qualificationCriteria(bound.qualification,{releaseHash:protocol.releaseHash,rubricHash:protocol.rubricHash,holdoutSealedAt:protocol.sealedAt,expectedCases,samplingHash:hash(expectedCases),development:score('development'),regression:score('regression')});
 return {...result,evidence:'Saved ledger, frozen compiled prompts/recipes/references, original file bytes and bound per-gate audits',protocolHash:hash(protocol),ledgerHash:hash(ledger)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
 try {console.log(JSON.stringify(qualifyFromFiles(process.argv[2]??'reviews/2026-09-06-prompt-system',process.argv[3]??'qualification-protocol.json'),null,2));}
 catch(error){console.log(JSON.stringify({qualified:false,status:'not_ready_or_invalid_evidence',reason:error.code==='ENOENT'?'Required frozen qualification evidence is absent.':error.message},null,2));process.exitCode=1;}
}
