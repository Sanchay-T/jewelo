import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {TEMPLATE,compile,normalize,hash} from './compiler.mjs';
import {rng} from './matrix.mjs';
const out='reviews/2026-09-06-prompt-system';
const save=(path,data)=>{mkdirSync(join(out,path,'..'),{recursive:true});writeFileSync(join(out,path),typeof data==='string'?data:JSON.stringify(data,null,2)+'\n');};
if(existsSync(join(out,'campaign.json')))throw Error('campaign_already_exists: do not overwrite immutable prompts or ledger');
const names={classical:'Classical',framed:'Framed minimal',rails:'Diamond rails',origami:'Origami ribbon'};
const cases=[];
for(const [id,construction]of Object.entries(names)){
  const geometry=JSON.parse(readFileSync(join(out,'references',id,'geometry.json'),'utf8'));
  const preflight=JSON.parse(readFileSync(join(out,'references',id,'preflight.json'),'utf8'));
  if(preflight.status!=='pass' || preflight.bodyHash!==geometry.bodyHash || preflight.assemblyHash!==geometry.assemblyHash)throw Error('preflight_hash_mismatch:'+id);
  const config=normalize({name:'محمد',twoNames:false,script:'Arabic',construction,lettering:'Classic',metal:'White gold',coverage:'No stones',size:32,chain:'Cable',engraving:''});
  const recipe={...geometry,status:'preflight_pass',configHash:hash(config),preflightHash:hash(preflight),stones:[],
    attachment:'Exactly two integral body eyelets at the designated attachment locations. Each existing eyelet receives one separate closed connecting ring, and each connecting ring receives the first cable-chain link. The connecting rings and alternating chain links remain separate interlocking parts. Continue the chain beyond the photographic frame; do not show loose cut ends beside the pendant.',
    invariants:'Preserve the core Muhammad lettering, its reading order, letter counters, approved support contacts and the two designated body attachment points. '+(id==='origami'?'Preserve continuous shallow folded-letter planes.':'Preserve the specified rigid body architecture.'),
  };
  save('recipes/'+id+'.json',recipe);
  for(const method of ['text','body','assembly'])for(let repeat=1;repeat<=4;repeat++){
    const references=method==='text'?[]:[{tag:method==='body'?'geometry':'assembly',path:'references/'+id+'/'+method+'.png',sha256:geometry[method+'Hash']}];
    const compiled=compile(config,{method,recipe,references});
    const caseId=id+'-'+method+'-'+repeat;
    save('prompts/'+caseId+'.txt',compiled.prompt);
    save('compiled/'+caseId+'.json',compiled);
    cases.push({id:caseId,family:id,method,repeat,compiledPath:'compiled/'+caseId+'.json',promptPath:'prompts/'+caseId+'.txt'});
  }
}
const r=rng(9012606);
for(let i=cases.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[cases[i],cases[j]]=[cases[j],cases[i]];}
save('screening-cases.json',cases);
save('master-template.txt',TEMPLATE);
const rubric={version:'1.0.0',frozenAt:new Date().toISOString(),
  gates:['identity','construction','attachments','selections','photography','unrequested_content'],
  verdicts:['pass','reject','needs_review'],
  required:'Every hard gate passes. Needs-review is not a pass. Judge visible output at native resolution and crops.',
  comparison:'Semantic correctness scored for all methods; exact contour preservation separately, applicable only where supplied as input.',
  crossView:'All four outputs pass and depict the same piece for development/qualification request success.',
  exclusions:['physical millimetre accuracy','metal karat verification','gem origin certification','manufacturing strength'],
  languageReview:'Arabic reviewed visually against preserved shaped identity; uncertain letters require competent adjudication.'};
save('rubric.json',rubric);
save('campaign.json',{version:'1.0.0',status:'screening_ready',createdAt:new Date().toISOString(),
  stageGates:{screening:true,development:false,ablation:false,regression:false,qualification:false},
  account:{authenticated:true,teamId:1068827,name:'Sanchay',unlimited:false,credits:308802,checkedAtSubmission:0,checkedAt:new Date().toISOString()},
  quotaBoundary:50,quotaResetEvidence:null,perImageCreditReservation:41,
  campaignCeiling:2832,rubricHash:hash(rubric),entries:[],creditCheckpoints:[],
  limitations:['Unverified 50-generation window; stop at boundary until verified.',
  'Screening covers only Muhammad / Classic / white gold / no stones / cable / nominal 32 mm.',
  'No production interfaces or verifier changes.','Original Arabic font/shaping lineage not independently rebuilt.']});
console.log(JSON.stringify({cases:cases.length,promptCharacters:JSON.parse(readFileSync(join(out,cases[0].compiledPath),'utf8')).prompt.length}));
