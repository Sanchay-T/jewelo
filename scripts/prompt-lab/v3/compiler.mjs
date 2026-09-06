import {readFileSync,realpathSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {analyzeArabic,describeIdentity,describeSupport,sha,stable,FONT} from './identity.mjs';
export const VERSION='arabic-inputs-3.0.0-candidate';
export const METHODS=['name_only','name_and_construction'];
const SCOPE={script:'Arabic',construction:'Classical',lettering:'Classic',metal:'White gold',coverage:'No stones',chain:'Cable',size:32,twoNames:false,engraving:''};
export const TEMPLATE='Create one photorealistic studio photograph of an original Arabic name necklace.\n\n{{identity}}\n\n{{referenceRoles}}\n\n{{construction}}\n\n{{appearance}}';
const APPEARANCE='Design a fresh, balanced composition with Classic Naskh character. You may choose graceful proportions, curves, flourishes and support routing while retaining the name and required relationships. Polished white gold, stone-free, Cable chain. No surrounding frame, backing plate, captions, labels or extra symbols. Near-front view on matte ivory under broad soft light; frame the entire pendant and both attachment junctions with sharp, readable metal edges and coherent reflections.';
const ROLE_TEXT={
  name_only:'Image 1, @name: exact customer spelling, identifying marks and contextual letter forms. Its contours and spacing are a readable name specimen, not a finished pendant outline. Preserve the written identity while creating a new jewelry composition.',
  name_and_construction:'Image 1, @name: exact customer spelling, identifying marks and contextual letter forms. Its contours and spacing are a readable name specimen, not a finished pendant outline. Preserve the written identity while creating a new jewelry composition.\nImage 2, @construction: transfer only the visible mark-to-stroke support and eyelet/connector/chain relationships. This unnamed example has no customer letters; do not copy its rectangular patch, sample dot or proportions into the design.'
};
const allowed=new Set(['name',...Object.keys(SCOPE)]);
function configuration(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('configuration_required');
  for(const key of Object.keys(input))if(!allowed.has(key))throw Error('unsupported_option:'+key);
  for(const [key,value] of Object.entries(SCOPE))if(input[key]!==undefined && input[key]!==value)throw Error('unsupported_configuration:'+key);
  const name=analyzeArabic(input.name);
  return {analyzed:name,config:{...SCOPE,name:name.identity.name}};
}
function referenceCheck(ref,role,analyzed){
  if(!ref||ref.role!==role||ref.tag!==role)throw Error('reference_role_mismatch');
  if(typeof ref.id!=='string'||!/^[a-z0-9][a-z0-9_-]{0,95}$/i.test(ref.id))throw Error('reference_id_required');
  if(typeof ref.path!=='string'||!ref.path||!(/^[a-f0-9]{64}$/).test(ref.sha256))throw Error('reference_descriptor_invalid');
  if(role==='name' && (ref.identityHash!==analyzed.identityHash || ref.name!==analyzed.identity.name || ref.script!=='Arabic' || ref.fontSha256!==FONT.sha256))throw Error('reference_customer_mismatch');
  if(role==='construction' && ref.customerIdentity!==false)throw Error('construction_must_not_prescribe_customer_identity');
}
export function compileCandidate(input,{method='name_only',references=[]}={}){
  if(!METHODS.includes(method))throw Error('unsupported_method');
  const {analyzed,config}=configuration(input);
  const roles=method==='name_only'?['name']:['name','construction'];
  if(references.length!==roles.length)throw Error('reference_role_mismatch');
  references.forEach((r,i)=>referenceCheck(r,roles[i],analyzed));
  if(new Set(references.map(r=>r.path)).size!==references.length)throw Error('duplicate_reference');
  if(new Set(references.map(r=>r.id)).size!==references.length)throw Error('duplicate_reference_id');
  const slots={identity:describeIdentity(analyzed),referenceRoles:ROLE_TEXT[method],construction:describeSupport(analyzed),appearance:APPEARANCE};
  const prompt=TEMPLATE.replace(/{{([a-zA-Z]+)}}/g,(_,key)=>slots[key]??(()=>{throw Error('missing_slot:'+key)})());
  if(/{{|}}/.test(prompt))throw Error('unresolved_slot');
  // An observability budget, NOT an OpenAI prompt optimum or API length limit.
  if(prompt.replace(/\s+/g,' ').length>3400)throw Error('prompt_exceeds_diagnostic_echo_budget');
  return {version:VERSION,status:'locally_compiled_not_model_tested',productionApproved:false,rawName:analyzed.rawName,config,configHash:sha(config),identity:analyzed.identity,identityHash:analyzed.identityHash,method,model:'gpt-image-2',ratio:'1:1',count:1,templateHash:sha(TEMPLATE),prompt,promptHash:sha(prompt),referenceDescriptors:structuredClone(references)};
}

export function verifyPacket(packet,root,{requireReview=true}={}){
  if(packet.version!==VERSION||packet.model!=='gpt-image-2'||packet.ratio!=='1:1'||packet.count!==1||packet.productionApproved!==false)throw Error('packet_settings_mismatch');
  const rebuilt=compileCandidate({...packet.config,name:packet.rawName},{method:packet.method,references:packet.referenceDescriptors});
  for(const key of ['configHash','identityHash','templateHash','promptHash','prompt','identity','config'])if(stable(packet[key])!==stable(rebuilt[key]))throw Error('packet_mismatch:'+key);
  for(const ref of packet.referenceDescriptors){
    const path=realpathSync(resolve(root,ref.path)),rel=relative(realpathSync(root),path);
    if(isAbsolute(rel)||rel==='..'||rel.startsWith('../'))throw Error('reference_outside_package');
    if(sha(readFileSync(path))!==ref.sha256)throw Error('reference_bytes_mismatch');
    if(requireReview && (ref.preflight?.status!=='pass'||ref.preflight.sha256!==ref.sha256))throw Error('reference_visual_preflight_required');
  }
  return {passed:true,promptHash:packet.promptHash,referenceHashes:packet.referenceDescriptors.map(r=>r.sha256)};
}

export function assembleRunwayRequest(packet,root,uploads){
  verifyPacket(packet,root);
  const expected=packet.referenceDescriptors.map(r=>r.id);
  if(!Array.isArray(uploads)||uploads.length!==expected.length)throw Error('upload_bindings_required');
  const referenceImages=packet.referenceDescriptors.map((ref,i)=>{
    const upload=uploads[i];
    if(upload.id!==ref.id||upload.sha256!==ref.sha256)throw Error('upload_binding_mismatch');
    const url=new URL(upload.url);if(url.protocol!=='https:')throw Error('https_upload_required');
    return {url:upload.url,tag:ref.tag};
  });
  // Returned to the caller in memory only. Never persist hosted URLs/authorization strings.
  return {model:packet.model,promptText:packet.prompt,ratio:packet.ratio,count:1,referenceImages};
}
