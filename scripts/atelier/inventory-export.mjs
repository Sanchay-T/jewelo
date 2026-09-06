import { open, link, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { finished } from 'node:stream/promises';

/** Publish a new data/summary pair. Never remove files not created by this run. */
export async function exportInventory(out, produce) {
 const owned=[]; const published=[];let stream;let complete=false;
 const candidate=out+'.partial-'+randomUUID();
 try {
  const file=await open(candidate,'wx');owned.push(candidate);
  stream=file.createWriteStream();
  const done=finished(stream);done.catch(()=>{});
  const summary=await produce(async job=>{if(!stream.write(JSON.stringify(job)+'\n'))await once(stream,'drain');});
  stream.end();await done;
  const summaryTemp=candidate+'.summary';
  const summaryFile=await open(summaryTemp,'wx');owned.push(summaryTemp);
  try{await summaryFile.writeFile(JSON.stringify(summary,null,2)+'\n');}finally{await summaryFile.close();}
  await link(candidate,out);published.push(out);
  await link(summaryTemp,out+'.summary.json');published.push(out+'.summary.json');
  complete=true;return summary;
 } finally {
  if(stream&&!stream.closed){stream.destroy();await finished(stream).catch(()=>{});}
  if(!complete)for(const path of published)await rm(path,{force:true});
  for(const path of owned)await rm(path,{force:true});
 }
}
