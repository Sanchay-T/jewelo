import { OPTIONS, normalize, hash } from './compiler.mjs';
export function rng(seed) {
  let s=seed>>>0;
  return () => {s+=0x6D2B79F5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
const NAMES = {
  Arabic:['محمد','أسماء','نور','عبد الرحمن','عبد الله','فاطمة','سارة','إيمان','آلاء','خالد','ليلى','زينب','يوسف','مريم','أحمد','جنى'],
  English:['Lia','Alexandra','Christopher','Amelia','Noor','Oliver','Isabella','Sophie','Charlotte','Emma','Benjamin','William','Olivia','Grace','James','Ava'],
};
const HELDOUT = {
  Arabic:['سليمان','هدى','طارق','ريم','حسن','دانية','رؤى','مصطفى','سلمى','بشرى','تسنيم','رضوان','وعد','صالح','ياسمين','صفاء'],
  English:['Eleanor','Sebastian','Margaret','Penelope','Theodore','Juliet','Vivienne','Nathaniel','Beatrice','Daphne','Harrison','Florence','Adelaide','Cecilia','Frederick','Lucia'],
};
const choose=(a,r)=>a[Math.floor(r()*a.length)];
function sample(r,names=NAMES) {
  const d=Object.fromEntries(Object.entries(OPTIONS).map(([k,a])=>[k,choose(a,r)]));
  d.twoNames=r()<0.5;d.name=choose(names[d.script],r);d.secondName=choose(names[d.script],r);
  if(d.twoNames && d.name===d.secondName)d.secondName=names[d.script][(names[d.script].indexOf(d.name)+1)%names[d.script].length];
  d.engraving='';d.requests='';
  return normalize(d);
}
function features(d) {
  const f=Object.keys(OPTIONS).filter(k=>Object.hasOwn(d,k)).map(k=>k+'='+d[k]);
  f.push('twoNames='+d.twoNames);
  f.push('nameExtent='+([...d.name].length>=9?'long':'short'));
  f.push('markedArabic='+(d.script==='Arabic' && /[أإآؤئ]/u.test(d.name)));
  return f;
}
function pairs(d) {
  const f=features(d),s=[];
  for(let i=0;i<f.length;i++)for(let j=i+1;j<f.length;j++)s.push(f[i]+'|'+f[j]);
  if(d.script==='Arabic' && /[أإآؤئ]/u.test(d.name))s.push('sentinel:'+d.construction+':marks');
  if(d.twoNames)s.push('sentinel:'+d.construction+':two');
  if([...d.name].length>=9 && d.coverage==='Full pavé')s.push('sentinel:'+d.construction+':long_full');
  if(d.metal==='White gold' && d.coverage==='No stones')s.push('sentinel:'+d.construction+':white_none');
  return s;
}
export function developmentMatrix() {
  const r=rng(20260906),pool=[],seen=new Set();
  for(let i=0;i<16000;i++){
    const d=sample(r),key=hash(d);if(!seen.has(key)){pool.push({d,p:pairs(d)});seen.add(key);}
  }
  const required=new Set(pool.flatMap(x=>x.p)),remaining=new Set(required),selected=[];
  const used=new Set();
  while(selected.length<128) {
    let best=-1,score=-1;
    for(let i=0;i<pool.length;i++){
      if(used.has(i))continue;
      const n=pool[i].p.reduce((a,p)=>a+Number(remaining.has(p)),0);
      if(n>score){score=n;best=i;}
    }
    if(best<0)break;
    used.add(best);selected.push(pool[best].d);pool[best].p.forEach(p=>remaining.delete(p));
  }
  const requirements = [
    ['long_dense',d=>[...d.name].length>=9 && ['Partial pavé','Full pavé'].includes(d.coverage)],
    ['arabic_marks',d=>d.script==='Arabic' && /[أإآؤئ]/u.test(d.name)],
    ['white_metal',d=>d.metal==='White gold'],
    ...OPTIONS.layout.map(v=>['layout_'+v,d=>d.twoNames && d.layout===v]),
    ...OPTIONS.construction.flatMap(c=>OPTIONS.chain.map(ch=>['hardware_'+c+'_'+ch,d=>d.construction===c && d.chain===ch])),
  ];
  const coverage=Object.fromEntries(requirements.map(([key,predicate])=>[key,selected.filter(predicate).length]));
  return {seed:20260906,selection:'greedy constrained pair coverage from 16000 deterministic samples; all four views per case',
    cases:selected.map((config,i)=>({id:'D'+String(i+1).padStart(3,'0'),config,configHash:hash(config),preflight:'not_prepared'})),
    coverage:{requiredPairs:required.size,coveredPairs:required.size-remaining.size,missingPairs:[...remaining],risks:coverage,
      passed:remaining.size===0 && Object.values(coverage).every(n=>n>0)},
    note:'Coverage is option-space evidence only. Each configuration still requires an inspected geometry/assembly/stone package before paid generation.'};
}
export function holdout(seed, frozenProtocol) {
  if(!frozenProtocol?.releaseHash || !frozenProtocol.rubricHash)throw Error('freeze_before_holdout');
  const r=rng(seed);
  return {seed,distribution:'IID independent equal-probability construction/script/twoNames and uniform applicable enums; disjoint fixed name pool',
    frozenProtocol,cases:Array.from({length:400},(_,i)=>({id:'Q'+String(i+1).padStart(3,'0'),config:sample(r,HELDOUT)}))};
}
export function sentinels(matrix) {
  const selected=[];
  for(const c of OPTIONS.construction)for(const predicate of [
    d=>d.script==='Arabic' && /[أإآؤئ]/u.test(d.name),
    d=>d.twoNames,
    d=>[...d.name].length>=9 && d.coverage==='Full pavé',
    d=>d.metal==='White gold' && d.coverage==='No stones',
  ]) {
    const v=matrix.cases.find(x=>x.config.construction===c && predicate(x.config) && !selected.some(s=>s.id===x.id));
    if(!v)throw Error('missing_sentinel:'+c);
    selected.push(v);
  }
  return selected.map((x,i)=>({...x,id:'R'+String(i+1).padStart(2,'0'),developmentCase:x.id}));
}
