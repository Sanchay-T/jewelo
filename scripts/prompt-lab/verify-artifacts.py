from pathlib import Path
import hashlib,json
from PIL import Image
root=Path(__file__).resolve().parents[2]/'reviews/2026-09-06-prompt-system'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
campaign=json.loads((root/'campaign.json').read_text())
cases=json.loads((root/'screening-cases.json').read_text())
errors=[];images=[]
for case in cases:
    compiled=json.loads((root/case['compiledPath']).read_text())
    if sha(root/case['promptPath'])!=compiled['promptHash'] or hashlib.sha256(compiled['prompt'].encode()).hexdigest()!=compiled['promptHash'] or (root/case['promptPath']).read_text()!=compiled['prompt']:errors.append(case['id']+': prompt changed')
    for ref in compiled['referenceDescriptors']:
        if sha(root/ref['path'])!=ref['sha256']:errors.append(case['id']+': reference changed')
for e in campaign['entries']:
    if e['status']=='succeeded':
        p=root/e['output']
        if sha(p)!=e['outputHash']:errors.append(e['caseId']+': output changed')
        with Image.open(p) as im:
            width,height=im.size;fmt=im.format;im.verify()
        if width<=0 or height<=0 or abs(width/height-1)>.01:errors.append(e['caseId']+': unexpected screening aspect')
        images.append({'caseId':e['caseId'],'sha256':e['outputHash'],'width':width,'height':height,'format':fmt,'bytes':p.stat().st_size})
report={'passed':not errors,'compiledCasesChecked':len(cases),'outputsChecked':len(images),'errors':errors,'images':images}
(root/'artifact-verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='images'}))
if errors:raise SystemExit(1)
