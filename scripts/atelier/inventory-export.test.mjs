import { test } from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {exportInventory} from './inventory-export.mjs';
async function fixture(run){const dir=await mkdtemp(join(tmpdir(),'caleums-export-test-'));try{await run(join(dir,'jobs.ndjson'),dir);}finally{await rm(dir,{recursive:true,force:true});}}
const produce=async write=>{await write({id:'one'});return {count:1};};
test('publishes completed data and summary while preserving pre-existing partial file',()=>fixture(async(out,dir)=>{await writeFile(out+'.partial','sentinel');await exportInventory(out,produce);assert.equal(await readFile(out+'.partial','utf8'),'sentinel');assert.equal(await readFile(out,'utf8'),'{"id":"one"}\n');assert.deepEqual(JSON.parse(await readFile(out+'.summary.json','utf8')),{count:1});assert.equal((await readdir(dir)).length,3);}));
test('existing summary is preserved and new data rolled back on collision',()=>fixture(async(out,dir)=>{await writeFile(out+'.summary.json','sentinel');await assert.rejects(exportInventory(out,produce));assert.equal(await readFile(out+'.summary.json','utf8'),'sentinel');assert.deepEqual(await readdir(dir),['jobs.ndjson.summary.json']);}));
test('existing data is never overwritten or deleted',()=>fixture(async(out,dir)=>{await writeFile(out,'sentinel');await assert.rejects(exportInventory(out,produce));assert.equal(await readFile(out,'utf8'),'sentinel');assert.deepEqual(await readdir(dir),['jobs.ndjson']);}));
test('producer failure publishes nothing and removes only owned temporary data',()=>fixture(async(out,dir)=>{await assert.rejects(exportInventory(out,async write=>{await write({id:'one'});throw new Error('simulated');}));assert.deepEqual(await readdir(dir),[]);}));
