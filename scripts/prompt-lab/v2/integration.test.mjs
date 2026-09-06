import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT} from './prepare.mjs';
test('preparation freezes48 cases and journal rejects changed compiled settings, references and order',()=>{
 const temp=mkdtempSync(resolve(tmpdir(),'jewelo-v2-preflight-'));
 try{
  mkdirSync(resolve(temp,'scripts/prompt-lab'),{recursive:true});
  cpSync(resolve(ROOT,'scripts/prompt-lab/compiler.mjs'),resolve(temp,'scripts/prompt-lab/compiler.mjs'));
  cpSync(resolve(ROOT,'scripts/prompt-lab/v2'),resolve(temp,'scripts/prompt-lab/v2'),{recursive:true});
  const out=resolve(temp,'reviews/2026-09-06-creative-name-v2');
  cpSync(resolve(ROOT,'reviews/2026-09-06-creative-name-v2/references'),resolve(out,'references'),{recursive:true});
  const command=(script,args=[],data={})=>spawnSync(process.execPath,[resolve(temp,'scripts/prompt-lab/v2',script),...args],{input:JSON.stringify(data),encoding:'utf8'});
  let r=command('prepare.mjs',[],{authenticated:true,teamId:1068827,credits:307842,unlimited:false});assert.equal(r.status,0,r.stderr);
  const cases=JSON.parse(readFileSync(resolve(out,'cases.json')));assert.equal(cases.length,48);
  assert.equal(new Set(cases.map(c=>c.id)).size,48);
  for(const c of cases){const compiled=JSON.parse(readFileSync(resolve(out,c.promptFile)));assert.equal(readFileSync(resolve(out,'prompts',c.id+'.txt'),'utf8'),compiled.prompt);}
  r=command('journal.mjs',['reserve'],{id:cases[1].id});assert.notEqual(r.status,0);assert.match(r.stderr,/must_reserve_next_randomized_case/);
  const first=resolve(out,cases[0].promptFile),original=readFileSync(first,'utf8'),edited=JSON.parse(original);edited.ratio='9:16';writeFileSync(first,JSON.stringify(edited));
  r=command('journal.mjs',['reserve'],{id:cases[0].id});assert.notEqual(r.status,0);assert.match(r.stderr,/compiled_case_mutated/);writeFileSync(first,original);
  const rf=resolve(out,'references/hardware.png'),bytes=readFileSync(rf);writeFileSync(rf,Buffer.concat([bytes,Buffer.from('changed')]));
  // Drive the next check directly through its public byte-verifier even when first arm uses no references.
  const check=spawnSync(process.execPath,['--input-type=module','-e',`import {verifyReference,read} from ${JSON.stringify(resolve(temp,'scripts/prompt-lab/v2/prepare.mjs'))};verifyReference(read(${JSON.stringify(resolve(out,'references/manifest.json'))}).references.find(r=>r.id==='hardware'));`],{encoding:'utf8'});
  assert.notEqual(check.status,0);assert.match(check.stderr,/reference_bytes_or_preflight_invalid/);writeFileSync(rf,bytes);
  r=command('journal.mjs',['reserve'],{id:cases[0].id});assert.equal(r.status,0,r.stderr);
  r=command('journal.mjs',['reserve'],{id:cases[0].id});assert.notEqual(r.status,0);assert.match(r.stderr,/must_reserve_next_randomized_case/);
  r=command('prepare.mjs',[],{authenticated:true,teamId:1068827,credits:307842,unlimited:false});assert.notEqual(r.status,0);assert.match(r.stderr,/frozen_campaign_already_exists/);
 }finally{rmSync(temp,{recursive:true,force:true});}
});
