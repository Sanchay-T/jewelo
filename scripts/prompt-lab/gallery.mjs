import {readFileSync,writeFileSync,existsSync,mkdirSync,symlinkSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {hash} from './compiler.mjs';
import {auditVerdict,imageVerdict} from './ledger.mjs';
const root='reviews/2026-09-06-prompt-system';
const read=name=>JSON.parse(readFileSync(join(root,name),'utf8'));
const campaign=read('campaign.json'),cases=read('screening-cases.json');
const audit=existsSync(join(root,'audit.json'))?read('audit.json'):{};
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const blindOrder=[...cases].sort((a,b)=>hash('blind-v1'+a.id).localeCompare(hash('blind-v1'+b.id)));
mkdirSync(join(root,'blind'),{recursive:true});
const blindIndex=blindOrder.map((c,i)=>{
 const compiled=read(c.compiledPath);
 const label='B'+String(i+1).padStart(3,'0');
 const entry=campaign.entries.find(e=>e.caseId===c.id);
 if(entry?.output && !existsSync(join(root,'blind',label+'.png')))symlinkSync('../'+entry.output,join(root,'blind',label+'.png'));
 return {label,caseId:c.id,family:c.family,semanticBrief:compiled.slots.construction_recipe+' '+compiled.slots.attachment_recipe,available:entry?.status==='succeeded',outputHash:entry?.outputHash??null};
});
writeFileSync(join(root,'blind-index.json'),JSON.stringify(blindIndex,null,2)+'\n');
const styles='*{box-sizing:border-box}body{margin:0;background:#f5f3ef;color:#242622;font:16px system-ui,sans-serif}main{max-width:1600px;margin:auto;padding:32px}h1{font-size:clamp(26px,4vw,44px);margin:0 0 12px}p{max-width:90ch;line-height:1.55}.muted{color:#60665d}.toolbar{display:flex;gap:14px;flex-wrap:wrap;position:sticky;top:0;background:#f5f3eff2;padding:12px 0;z-index:2}select,button{font:inherit;padding:9px;border:1px solid #aab0a5;border-radius:7px;background:white}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,430px),1fr));gap:20px}article{background:white;border:1px solid #d8dcd2;border-radius:12px;overflow:hidden}article>header,article>section{padding:16px}article h2{font-size:19px;margin:0 0 8px}.tag{display:inline-block;padding:4px 8px;border-radius:5px;background:#e9ece5;font-size:13px}.reject{background:#f9dcd6}.pass{background:#dcebd9}.needs_review{background:#fff0cb}pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto;font-size:12px;line-height:1.5;background:#f8f8f6;padding:12px}img{display:block;width:100%;height:auto}summary{cursor:pointer}table{border-collapse:collapse;margin:20px 0;width:100%;max-width:1000px}th,td{text-align:left;border-bottom:1px solid #ccd1c7;padding:10px}.placeholder{min-height:180px;display:grid;place-items:center;background:#eee}.refs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.refs a{color:inherit}a{color:#355742}label{display:flex;gap:6px;align-items:center}[hidden]{display:none!important}';
const counts={};
for(const c of cases){
 const k=c.family+'/'+c.method;if(!counts[k])counts[k]={pass:0,reject:0,needs_review:0,pending:0};
 const e=campaign.entries.find(e=>e.caseId===c.id);
 const verdict=imageVerdict(e,audit[c.id],campaign.rubricHash);
 counts[k][verdict]++;
}
const cards=[...cases].sort((a,b)=>a.family.localeCompare(b.family)||a.repeat-b.repeat||['text','body','assembly'].indexOf(a.method)-['text','body','assembly'].indexOf(b.method)).map(c=>{
 const e=campaign.entries.find(e=>e.caseId===c.id),a=audit[c.id];
 const verdict=imageVerdict(e,a,campaign.rubricHash);
 const semantic=auditVerdict(e,a,campaign.rubricHash);
 const label=blindIndex.find(b=>b.caseId===c.id).label;
 const crops=readdirSync(join(root,'crops')).filter(f=>f.startsWith(label+'-')&&f.endsWith('.png'));
 const prompt=readFileSync(join(root,c.promptPath),'utf8');
 return '<article id="'+esc(c.id)+'" data-family="'+esc(c.family)+'" data-method="'+esc(c.method)+'" data-verdict="'+esc(verdict)+'"><header><h2>'+esc(c.family)+' · '+esc(c.method)+' · repetition '+c.repeat+'</h2><span class="tag '+esc(verdict)+'">Overall: '+esc(verdict)+'</span><span class="tag '+esc(semantic)+'">Semantic: '+esc(semantic)+'</span><span class="tag '+esc(a?.referenceFidelity)+'">Reference: '+esc(a?.referenceFidelity??"not reviewed")+'</span><details open><summary>Exact submitted prompt</summary><pre>'+esc(prompt)+'</pre></details></header>'+
 (e?.output?'<a href="'+esc(e.output)+'"><img loading="lazy" src="'+esc(e.output)+'" alt="'+esc(c.id)+' original Runway output"></a>':'<div class="placeholder">'+esc(e?.error??'Not generated')+'</div>')+
 '<section><p>'+esc(a?.notes??'No visual pass has been recorded.')+'</p>'+
 (a?.independentReview?'<p class="muted">Independent review: '+esc(a.independentReview)+'</p>':'')+
 (a?.independentReferenceReview?'<p class="muted">Reference review: '+esc(a.independentReferenceReview)+'</p>':'')+
 (crops.length?'<details><summary>Original-pixel detail crops ('+crops.length+')</summary>'+crops.map(f=>'<a href="crops/'+esc(f)+'"><img loading="lazy" src="crops/'+esc(f)+'" alt="'+esc(f)+' native detail"></a>').join('')+'</details>':'')+
 (a?.gates?'<details><summary>Audit details</summary><pre>'+esc(JSON.stringify(a.gates,null,2))+'</pre></details>':'')+
 '<details><summary>Lineage</summary><pre>'+esc(JSON.stringify(e??{case:c.id,status:'not_submitted'},null,2))+'</pre></details></section></article>';
}).join('');
const n=campaign.entries.length,finished=campaign.entries.filter(e=>['succeeded','failed'].includes(e.status)).length;
const delta=308802-campaign.account.credits;
const body='<main><h1>Jewelry prompt laboratory</h1><p>One fixed specification. Three input methods. Four construction recipes. Original outputs and failures retained. Overall pass requires semantic correctness and, when supplied, reference fidelity. Uncertain cases do not pass.</p><p class="muted">'+n+'/48 submitted · '+finished+' finished · '+Object.keys(audit).length+' visually reviewed · '+delta+' credits observed workspace decrease at latest checkpoint. <strong>Not qualified for production.</strong></p><p><a href="report.md">Qualification report</a> · <a href="master-template.txt">Master template</a> · <a href="blind-review.html">Blind review</a> · <a href="development-matrix.json">128-case matrix</a></p><details><summary>Reference packages and measurement caveat</summary><p>22/32 mm are nominal labels; physical dimensions are not certified. Origami tests shallow folded lettering. No stones in screening; all other forms remain development targets.</p><div class="refs">'+['classical','framed','rails','origami'].map(f=>'<a href="references/'+f+'/assembly.png"><img src="references/'+f+'/assembly.png" alt="'+f+' assembly reference">'+f+'</a>').join('')+'</div></details><table><thead><tr><th>Family / method</th><th>Overall pass</th><th>Overall reject</th><th>Needs review</th><th>Pending</th></tr></thead><tbody>'+
 Object.entries(counts).map(([k,v])=>'<tr><td>'+esc(k)+'</td><td>'+v.pass+'</td><td>'+v.reject+'</td><td>'+v.needs_review+'</td><td>'+v.pending+'</td></tr>').join('')+
 '</tbody></table><div class="toolbar"><label>Construction <select id="family"><option value="">All</option>'+['classical','framed','rails','origami'].map(f=>'<option>'+f+'</option>').join('')+'</select></label><label>Input <select id="method"><option value="">All</option><option>text</option><option>body</option><option>assembly</option></select></label><label>Result <select id="verdict"><option value="">All</option><option>pass</option><option>reject</option><option>needs_review</option><option>pending</option></select></label><button onclick="location.reload()">Reload saved review</button></div><div class="grid">'+cards+'</div></main><script>for(const id of ["family","method","verdict"])document.getElementById(id).addEventListener("change",()=>{for(const card of document.querySelectorAll("article"))card.hidden=["family","method","verdict"].some(k=>document.getElementById(k).value&&card.dataset[k]!==document.getElementById(k).value)});</script>';
const page=(title,body)=>'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>'+styles+'</style>'+body+'</html>';
writeFileSync(join(root,'review.html'),page('Jewelry prompt laboratory',body));
const blind='<main><h1>Blind semantic review</h1><p>Input methods and prompts are withheld here. Review the original pixels against the stated family and rubric. Exact contour fidelity is assessed separately after this semantic review.</p><p><a href="rubric.json">Frozen rubric</a></p><div class="grid">'+blindIndex.map(b=>'<article><header><h2>'+b.label+' · '+esc(b.family)+'</h2><p>محمد · white gold · no stones · Cable · Studio</p><p>'+esc(b.semanticBrief)+'</p></header>'+(b.available?'<a href="blind/'+b.label+'.png"><img loading="lazy" src="blind/'+b.label+'.png" alt="'+b.label+' '+b.family+' original output"></a>':'<div class="placeholder">Pending</div>')+'</article>').join('')+'</div></main>';
writeFileSync(join(root,'blind-review.html'),page('Blind jewelry review',blind));
console.log(JSON.stringify({submitted:n,finished,audited:Object.keys(audit).length,gallery:join(root,'review.html')}));
