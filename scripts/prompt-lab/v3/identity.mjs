import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

export const PROFILE = JSON.parse(readFileSync(new URL('./arabic-profile.json', import.meta.url)));
export const sha = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : stable(value)).digest('hex');
export const stable = value => JSON.stringify(value, function(k,v){return v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(key=>[key,v[key]])) : v;});
export const FONT = Object.freeze({file:'NotoNaskhArabic-Regular.ttf',sha256:'67b5a525a661b607971fbd3f96a81b89d3a768e74534fca84f18ac97e6fab72f'});

// Explicit STANDARD NASKH conventions, separate from Unicode joining data.
// Dots belong to letters, not Unicode combining-mark counts or raster islands.
const DOTS = {ب:[1,'below'],ت:[2,'above'],ث:[3,'above'],ج:[1,'below'],خ:[1,'above'],ذ:[1,'above'],ز:[1,'above'],ش:[3,'above'],ض:[1,'above'],ظ:[1,'above'],غ:[1,'above'],ف:[1,'above'],ق:[2,'above'],ن:[1,'above'],ي:[2,'below'],ة:[2,'above']};
const SIGNS = {أ:['hamza','above'],إ:['hamza','below'],ؤ:['hamza','above'],ئ:['hamza','above'],آ:['madda','above']};
export const MARK_PROFILE_HASH = sha({DOTS,SIGNS,kaf:'small kaf form inside isolated/final kaf',profile:PROFILE});

export function analyzeArabic(rawName) {
  if(typeof rawName !== 'string' || !rawName) throw Error('name_required');
  const name=rawName.normalize('NFC'), chars=Array.from(name);
  if(chars.length>24) throw Error('name_exceeds_diagnostic_scope');
  // A standalone hamza is a LETTER, not a mark on an owning base stroke.
  // Its support and mount-root policy is not yet defined for this prototype.
  if(chars.includes('ء'))throw Error('standalone_hamza_requires_support_recipe');
  for(const c of chars) if(!Object.hasOwn(PROFILE.letters,c)) throw Error('unsupported_character:U+'+c.codePointAt(0).toString(16).toUpperCase());
  const letters=chars.map((character,index)=>({id:'letter-'+index,index,character,...PROFILE.letters[character]}));
  const joins=letters.slice(0,-1).map((left,index)=>({leftInLogicalOrder:left.id,rightInLogicalOrder:letters[index+1].id,joined:left.joiningType==='D' && ['D','R'].includes(letters[index+1].joiningType)}));
  let groupIndex=0;
  const groups=[];
  letters.forEach((letter,index)=>{
    if(index && !joins[index-1].joined) groupIndex++;
    letter.groupId='group-'+groupIndex;
    letter.contextualForm=(index && joins[index-1].joined) ? (joins[index]?.joined?'medial':'final') : (joins[index]?.joined?'initial':'isolated');
    groups[groupIndex]??={id:letter.groupId,letterIds:[],text:''};
    groups[groupIndex].letterIds.push(letter.id);groups[groupIndex].text+=letter.character;
  });
  const marks=[];
  for(const letter of letters){
    const features=[];
    if(DOTS[letter.character]) features.push({kind:'dot',count:DOTS[letter.character][0],position:DOTS[letter.character][1]});
    if(SIGNS[letter.character]) features.push({kind:SIGNS[letter.character][0],count:1,position:SIGNS[letter.character][1]});
    if(letter.character==='ك' && ['final','isolated'].includes(letter.contextualForm))features.push({kind:'small kaf form',count:1,position:'inside'});
    for(const feature of features)marks.push({id:'mark-'+marks.length,ownerLetterId:letter.id,ownerGroupId:letter.groupId,ownerCharacter:letter.character,...feature});
  }
  const graph={groups:groups.map(g=>g.id),marks:marks.map(m=>m.id),relations:[
    ...marks.map(m=>({kind:'support_mark',from:m.id,to:m.ownerGroupId,ownerLetterId:m.ownerLetterId,count:m.count})),
    ...groups.slice(1).map((g,i)=>({kind:'bridge_linguistic_break',from:groups[i].id,to:g.id})),
    {kind:'integral_body_eyelet',from:'eyelet-right',to:groups[0].id,prohibitedRoot:'identifying mark'},
    {kind:'integral_body_eyelet',from:'eyelet-left',to:groups.at(-1).id,prohibitedRoot:'identifying mark'},
    ...['left','right'].flatMap(side=>[{kind:'interlock',from:'eyelet-'+side,to:'connector-'+side},{kind:'interlock',from:'connector-'+side,to:'first-chain-link-'+side}])
  ],meaning:'Required relationships, not coordinates, shape, strength proof or the number of disconnected raster pieces.'};
  const identity={name,script:'Arabic',direction:'rtl',profile:PROFILE.version,profileHash:MARK_PROFILE_HASH,font:FONT,letters,joins,groups,marks,graph};
  return {rawName,identity,identityHash:sha(identity)};
}

export function describeIdentity({identity}) {
  const detail=identity.marks.map(m=>`${m.count} ${m.kind}${m.count===1?'':'s'} ${m.position} ${m.ownerCharacter} (letter ${Number(m.ownerLetterId.split('-')[1])+1} in right-to-left reading order)`).join('; ');
  const hamza=identity.letters.some(l=>'أإؤئء'.includes(l.character));
  return `Spell exactly "${identity.name}" in naturally joined, upright Arabic. Required identifying marks: ${detail||'no identifying dots or hamzas'}.${hamza?'':' No hamza is present.'} Keep each mark with its owning letter and retain the number and above/below placement. Natural joining groups, in reading order: ${identity.groups.map(g=>'"'+g.text+'"').join(' / ')}. These groups describe linguistic breaks; the displayed name remains one complete Arabic word.`;
}

export function describeSupport({identity}) {
  const bridges=identity.groups.slice(1).map((g,i)=>`"${identity.groups[i].text}" to "${g.text}"`).join(', ');
  return `Make one connected metal pendant body. ${bridges?'Add a narrow non-letter bridge across each natural break: '+bridges+'. ':''}${identity.marks.length?'Give every detached identifying mark a visible narrow support to its own letter/group; keep its original position. ':''}Keep support stems distinct from letter strokes and preserve open counters. Grow two closed eyelets from substantial body strokes: one on the rightmost group and one on the leftmost group. Eyelets must not replace dots, turn into letters or hang from a detached mark. Each eyelet receives a separate closed connector, which also passes through the first Cable-chain link. Show finite-width metal joins and readable interlocks.`;
}
