import {OUT,read} from './prepare.mjs';
import {resolve} from 'node:path';
const s=read(resolve(OUT,'ledger.json'));
console.log(JSON.stringify({account:s.account,pauseReasons:s.pauseReasons,entries:s.entries.map(({key,caseId,status,taskId,output,outputHash})=>({key,caseId,status,taskId,output,outputHash}))}));
