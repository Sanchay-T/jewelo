"""Capture representative actual UI states in an isolated agent-browser session.
Requires installed agent-browser; dev server on localhost:3001. No providers or checkout.
"""
import subprocess,json,time,sys
from pathlib import Path
from PIL import Image,ImageDraw
OUT=Path('docs/proof/responsive-atelier/fixed-renderer');OUT.mkdir(parents=True,exist_ok=True)
SESSION='atelier-geometry-review'
def ab(*args):
 p=subprocess.run(['agent-browser','--session',SESSION,*args],capture_output=True,text=True)
 if p.returncode: raise RuntimeError(p.stderr+p.stdout)
 return p.stdout

def ready():
 ab('wait','--fn',"!document.body.innerText.includes('Updating preview') && !!document.querySelector('img[alt^=\"Fixed\"]')")
def click(label):
 ab('eval','document.querySelector('+json.dumps(f'button[aria-label="{label}"]')+').scrollIntoView({block:"center"})')
 ab('click',f'button[aria-label="{label}"]');ready()
def capture(key):
 click('Studio');ab('eval','window.scrollTo(0,0)');time.sleep(0.6)
 ab('screenshot',str(OUT/f'{key}.png'))
 text=ab('eval',"JSON.stringify(document.querySelector('img[alt^=\"Fixed\"]').getBoundingClientRect().toJSON())")
 line=next(line for line in text.splitlines() if line.startswith('"{'))
 r=json.loads(json.loads(line));im=Image.open(OUT/f'{key}.png');im.crop((r['x'],r['y'],r['right'],r['bottom'])).save(OUT/f'{key}-piece.png')
 print(key,flush=True)

if '--short' in sys.argv:
 ready();click('Arabic');click('Two names');click('Classic');click('Classical')
 for width,height in [(1440,800),(1265,712)]:
  ab('set','viewport',str(width),str(height))
  for layout in ['Stacked','Interlocked']:
   click(layout);capture(f'{width}x{height}-arabic-'+layout.lower())
 sys.exit(0)

ready()
for language in ['English','Arabic']:
 click(language);click('One name');click('Classic');click('Classical');capture(language.lower()+'-single')
 click('Two names')
 for layout in ['Side by side','Connected heart','Stacked','Infinity','Interlocked']:
  click(layout);capture(language.lower()+'-'+layout.lower().replace(' ','-'))
click('English');click('One name')
for construction in ['Classical','Origami ribbon','Framed minimal','Diamond rails']:
 click(construction);capture('construction-'+construction.lower().replace(' ','-'))
files=list(OUT.glob('*-piece.png'));sheet=Image.new('RGB',(1200,((len(files)+2)//3)*340),'#fff9f0');d=ImageDraw.Draw(sheet)
for i,p in enumerate(files):
 x=(i%3)*400;y=(i//3)*340;im=Image.open(p);im.thumbnail((390,300));sheet.paste(im,(x,y+30));d.text((x+5,y+5),p.stem,fill='black')
sheet.save(OUT/'states-contact-sheet.png')
