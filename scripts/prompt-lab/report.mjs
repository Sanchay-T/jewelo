import {readFileSync,writeFileSync} from 'node:fs';
import {imageVerdict,auditVerdict} from './ledger.mjs';
const root='reviews/2026-09-06-prompt-system';
const read=n=>JSON.parse(readFileSync(root+'/'+n,'utf8'));
const c=read('campaign.json'),cases=read('screening-cases.json'),audit=read('audit.json');
const blank=()=>({total:0,pass:0,reject:0,needs_review:0,pending:0});
const methods={},families={},semantic=blank(),overall=blank();
for(const x of cases){
 const e=c.entries.find(e=>e.caseId===x.id),a=audit[x.id],v=imageVerdict(e,a,c.rubricHash),s=auditVerdict(e,a,c.rubricHash);
 for(const bucket of [methods[x.method]??=(blank()),families[x.family+'/'+x.method]??=(blank()),overall]){bucket.total++;bucket[v]++;}
 semantic.total++;semantic[s]++;
}
const n=c.entries.length,finished=c.entries.filter(e=>['succeeded','failed'].includes(e.status)).length;
const complete=n===48&&finished===48&&Object.keys(audit).length===48&&cases.every(x=>x.method==='text'||['pass','reject','needs_review'].includes(audit[x.id]?.referenceFidelity));
const baseline=308802,latestBalance=c.account.credits,observedDebit=baseline-latestBalance;
let prior=baseline;
const observations=c.entries.map(e=>{const balance=e.balanceAfterSubmission;const d=Number.isFinite(balance)?prior-balance:null;if(Number.isFinite(balance))prior=balance;return {caseId:e.caseId,taskId:e.taskId,observedBalance:balance,changeSincePreviousSubmissionObservation:d};});
const metrics={status:complete?'screening_review_complete_not_qualified':'screening_in_progress_not_qualified',submitted:n,terminal:finished,semantic,overall,methods,families,baselineCredits:baseline,lastCheckpointCredits:latestBalance,observedWorkspaceDebit:observedDebit,providerFailures:c.entries.filter(e=>e.status==='failed').length,qualification:{qualified:false,requests:0,views:0,lower95:null},reviewScope:'AI-assisted visual R&D assessment; no claim of human script certification, physical dimensions or manufacturing accuracy'};
writeFileSync(root+'/metrics.json',JSON.stringify(metrics,null,2)+'\n');
writeFileSync(root+'/credit-ledger.json',JSON.stringify({baselineCredits:baseline,observations,checkpoints:c.creditCheckpoints,paidPreparationGenerations:0,referenceUploads:8,attribution:'Observed workspace balance changes. No itemized per-task or upload invoice is exposed; concurrent workspace usage could affect deltas.'},null,2)+'\n');
const rows=Object.entries(methods).sort().map(([m,v])=>`| ${m} | ${v.pass}/${v.total} | ${v.reject} | ${v.needs_review} | ${v.pending} |`).join('\n');
const familyRows=Object.entries(families).sort().map(([m,v])=>`| ${m} | ${v.pass}/${v.total} | ${v.reject} | ${v.needs_review} |`).join('\n');
const failed=cases.filter(x=>['reject','needs_review'].includes(imageVerdict(c.entries.find(e=>e.caseId===x.id),audit[x.id],c.rubricHash))).map(x=>`- **[${x.id}](review.html#${x.id}) (${audit[x.id]?.label??'unreviewed'}):** ${audit[x.id]?.notes??'Unreviewed.'}${audit[x.id]?.referenceFidelity==='reject'?' Reference fidelity is also rejected.':''}`).join('\n');
const text=`# Jewelry prompt qualification report

**${complete?'Screening complete; package not qualified.':'Screening running; package not qualified.'}** ${n}/48 screening images submitted, ${finished} terminal outputs, ${Object.keys(audit).length} visually reviewed. No development, regression or final qualification generations have run.

The [exported prompt package](prompt-package.json) defines every variable, enum, construction and view. The reusable compiler, four construction sections, four shot sections, deterministic reference preflight, ledger, blind review, comparison gallery and file-backed qualification checks are implemented in the isolated R&D branch. The current paid runner executes the screening manifest. Later execution requires prepared geometry packages and sealed full-view manifests. No production code or customer verification behavior changed.

## Measured screening results

| Input method | Overall passes | Definite rejects | Uncertain / review missing | Pending generation |
| --- | ---: | ---: | ---: | ---: |
${rows}

Overall: **${overall.pass}/48 passes**, ${overall.reject} definite rejects, ${overall.needs_review} uncertain/unreviewed, ${overall.pending} pending. Semantic-only passes: ${semantic.pass}/48. An overall pass also requires reference fidelity when a reference was supplied. Uncertainty does not pass. All first attempts remain in the denominator; no failed output was replaced by a retry.

| Construction / input | Overall passes | Definite rejects | Uncertain / review missing |
| --- | ---: | ---: | ---: |
${familyRows}

These are screening-image observations, not complete four-view request success rates. Four repetitions per construction/method are too few to establish 99% reliability or a statistically decisive ranking. Reviews used blinded labels and common semantic construction requirements, followed by reference comparison; independent agent adjudication is recorded where performed. The B018 support-count and B044 fold judgments were revised with their history preserved. This is AI-assisted R&D review, not a substitute for competent human Arabic spelling approval during formal qualification.

## Decision from this screening

Carry the **complete assembly reference** into the next development candidate: it produced 14/16 overall passes, compared with 10/16 for body-only references and 6/16 for text-only. This is a descriptive screening result, not proof that the method will remain superior on other names or views. Both reference methods passed all eight frame/rail cases; remaining complete-assembly failures were in Classical and Origami.

The next bounded revision should target exactly those observed errors: preserve the existing left body eyelet rather than turning it into an uninspectable tip/loop; use both canonical eyelets rather than adding substitute side attachments; preserve the direct eyelet-to-letter neck contour. A candidate wording comparison can explicitly require that both existing eyelet apertures are occupied by their connecting rings and that no body eyelet is unused. This wording is **untested**, and must not replace the frozen current prompts or be called a fix before an interleaved comparison. Reference clarity and actual ring threading remain part of the same experiment.

## What was actually tested

One name: **محمد (Muhammad)**, Arabic Classic lettering, White gold, No stones, nominal **32 mm**, Cable chain, one name, Studio, 1:1, Runway MCP **gpt-image-2**, count 1. Four distinct construction candidates were used: Classical; Framed minimal with two lower supports; Diamond rails with four supports; Origami ribbon interpreted narrowly as shallow folded lettering. Body and complete assembly references were derived from the same underlying deterministic geometry. Text-only had no supplied contour.

The complete-assembly render shows local interlocking hardware and chains continuing beyond frame. It is not a full necklace/clasp manufacturing design. References have one connected rigid body, with per-support overlap checks; those checks do not certify strength or millimetre dimensions. Existing reference defects were corrected before submissions. Submitted reference and prompt bytes stayed frozen.

## Failures and uncertainties retained

${failed||'No reviewed failures yet; pending review is not a pass.'}

Use [the comparison gallery](review.html) for exact prompts above original images, method comparisons, native detail crops, reference thumbnails and lineage. The [blind page](blind-review.html) withholds method labels. [Audit history](audit-history.jsonl) preserves revisions; [artifact verification](artifact-verification.json) checks saved original bytes.

## Credits and stopping boundary

Initial observed balance: **${baseline.toLocaleString('en-US')} credits**. Latest account checkpoint: **${latestBalance.toLocaleString('en-US')}**. Observed workspace decrease at that checkpoint: **${observedDebit} credits**. Read [the credit ledger](credit-ledger.json) for every submission balance and checkpoint; later in-flight submissions may postdate the checkpoint. Eight reference uploads were used, with zero paid preparation image generations. No purchases, top-ups, native ImageGen substitutions or direct API tests occurred. Balance differences are observations, not a provider invoice.

Runway's [official MCP FAQ](https://help.runwayml.com/hc/en-us/articles/51931843164691-Connecting-to-Runway-MCP) says MCP is credit-based and Explore Mode is unsupported. The suspected 50-submission limit/reset remains unverified; [research notes](quota-research.md) preserve that limitation. The accepted conservative stop is still 50. After the 48-image screening, two remaining submissions cannot fit one complete four-view development request, so the broader paid campaign must stay closed until this boundary is resolved. Maximum observed concurrency is governed by two active reservations/tasks; balance checks occur after 20, 40 and final submissions.

## Support and next gates

The [128-case development matrix](development-matrix.json) covers all 798 pair/risk requirements identified in its deterministic 16,000-candidate pool and supplies [16 difficult-case definitions](regression-cases.json). It is not exhaustive Cartesian coverage and does not establish valid geometry. Those cases remain **not_prepared**. All form options remain targets; none were silently deleted to improve the measured rate.

Still required before broad development: inspected lettering specimens for every script/style adaptation; supported Arabic dots/hamzas and meaningful spacing; all two-name arrangements; construction-compatible stone placement and settings; all chain/attachment combinations; nonempty engraving with a defined surface; and the four-view case manifests. Nominal 22/32 mm are retained, but the physical measurement meaning is unresolved and dimensional accuracy is excluded. Arbitrary free-text requests remain outside the supported prompt compiler.

1. Resolve the quota boundary, then freeze the selected input method and any evidence-driven construction revisions in a new version. Do not rewrite current trial prompts.
2. Prepare and inspect the missing deterministic packages, compile the 128-case matrix into four views and two independent repetitions, and verify all declared option/risk coverage before calls.
3. Execute the bounded development and targeted wording stages. Advance only at >=99% complete-request development success and 16/16 difficult requests passing all four views.
4. Freeze release, references, settings, rubric and sampling protocol before generating 400 previously unused requests. Require all 400 complete requests to pass. The file-backed qualifier reads actual ledger/original/reference/audit evidence, rejects reused images and late prerequisite reviews, and retains provider failures in the denominator.

There is **no 99% or 100% reliability claim** from this screening. The 400/400, one-sided 95% lower bound of approximately 99.25% remains the future criterion under the declared sampling assumptions, not an observed result. No production API readiness is claimed. Actual API integration requires a separately requested qualification on that model, adapter and settings.
`;
writeFileSync(root+'/report.md',text);
console.log(JSON.stringify({status:metrics.status,overall:metrics.overall,creditsAtCheckpoint:latestBalance}));
