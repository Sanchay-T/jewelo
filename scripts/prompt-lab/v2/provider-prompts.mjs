import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {OUT,read} from './prepare.mjs';
import {hash} from './compiler.mjs';
const records=JSON.parse(readFileSync(0,'utf8'));
const checks=records.map(r=>{
 const c=read(resolve(OUT,'prompts',r.caseId+'.json'));
 const normalized=c.prompt.replace(/\s+/g,' ').trim();
 return {caseId:r.caseId,taskId:r.taskId,submittedPromptHash:c.promptHash,submittedLength:c.prompt.length,normalizedLength:normalized.length,
  submissionReportedHash:r.submissionPrompt===null?null:hash(r.submissionPrompt),
  outputReportedHash:r.outputPrompt===null?null:hash(r.outputPrompt),
  submissionMatches:r.submissionPrompt===null?null:r.submissionPrompt===c.prompt,
  outputMatches:r.outputPrompt===null?null:r.outputPrompt===c.prompt,
  submissionReturnedLength:r.submissionPrompt?.length??null,outputReturnedLength:r.outputPrompt?.length??null,
  submissionNormalizedEqual:r.submissionPrompt===null?null:r.submissionPrompt===normalized,
  submissionIsNormalizedPrefix:r.submissionPrompt===null?null:normalized.startsWith(r.submissionPrompt),
  outputIsNormalizedPrefix:r.outputPrompt===null?null:normalized.startsWith(r.outputPrompt)};
});
const result={checked:checks.length,unexpectedContentDifferences:checks.filter(c=>c.submissionIsNormalizedPrefix===false||c.outputIsNormalizedPrefix===false).map(c=>c.caseId),
 completeNormalizedSubmissionEchoes:checks.filter(c=>c.submissionNormalizedEqual).length,
 abbreviatedSubmissionEchoes:checks.filter(c=>c.submissionIsNormalizedPrefix&&!c.submissionNormalizedEqual).length,
 interpretation:'Tool readbacks collapse whitespace; generation responses abbreviate long prompts at3500characters and completion responses show60characters. Prefix equality confirms the displayed text only. Full downstream provider payload and whether its formatting is preserved are not exposed; do not treat abbreviated echoes as evidence of actual payload truncation.',checks};
writeFileSync(resolve(OUT,'provider-prompt-verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,checks:undefined}));
