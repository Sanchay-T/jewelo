"""Lossless inspection crops; original provider bytes are never edited."""
from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parents[3]/'reviews/2026-09-06-creative-name-v2'
ledger=json.loads((root/'ledger.json').read_text());cases={c['id']:c for c in json.loads((root/'cases.json').read_text())}
(root/'crops').mkdir(exist_ok=True)
for e in ledger['entries']:
 if e['status']!='succeeded':continue
 with Image.open(root/e['output']) as im:
  w,h=im.size;boxes={'tl':(0,0,(w+1)//2,(h+1)//2),'tr':(w//2,0,w,(h+1)//2),'bl':(0,h//2,(w+1)//2,h),'br':(w//2,h//2,w,h)}
  for q,box in boxes.items():
   dest=root/'crops'/f"{cases[e['caseId']]['blindId']}-{q}.png"
   if not dest.exists():im.crop(box).save(dest)
print('Inspection crops saved; originals unchanged.')
