"""Zero-credit reference kit. Native HarfBuzz shaping; no glyph fusion or tracking.
Hardware is a deterministic depth-rendered relationship specimen, not jewelry CAD.
"""
from pathlib import Path
import hashlib, json, subprocess
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'reviews/2026-09-06-creative-name-v2/references'
FONTS = ROOT / 'packages/identity/engines/caleums-arabic-v3/fonts'
FONT_INFO = {
 'Arabic': ('NotoNaskhArabic-Regular.ttf','67b5a525a661b607971fbd3f96a81b89d3a768e74534fca84f18ac97e6fab72f','rtl','arab','ar'),
 'English': ('PlayfairDisplay-SemiBold.ttf','c40f2293766a503bc70cce9e512ef844a4ccb7cbcde792fe2ea31d191917d8d6','ltr','latn','en')}
NAMES = [('ar-liyan','Arabic','ليان'),('ar-noor','Arabic','نور'),('ar-iman','Arabic','إيمان'),('en-ava','English','Ava'),('en-lily','English','Lily'),('en-christopher','English','Christopher')]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def run(args): return subprocess.check_output(args,text=True).strip()
def text_card(id, script, words, role):
    font, expected, direction, sc, lang = FONT_INFO[script]
    source=FONTS/font
    assert sha(source)==expected, 'pinned_font_hash_mismatch'
    parts=[]; shaped=[]
    for i,word in enumerate(words):
        args=[str(source),word,'--direction='+direction,'--script='+sc,'--language='+lang]
        glyphs=json.loads(run(['/opt/homebrew/bin/hb-shape',*args,'--no-glyph-names','--output-format=json']))
        assert glyphs and all(g['g'] != 0 for g in glyphs), 'missing_glyph'
        part=OUT/'source'/f'{id}-{i}.png'
        subprocess.run(['/opt/homebrew/bin/hb-view',*args,'--font-size=220','--margin=40','--ink','--output-file='+str(part)],check=True)
        parts.append(Image.open(part).convert('RGB')); shaped.append({'text':word,'glyphs':glyphs,'renderHash':sha(part)})
    width=max(1000,max(p.width for p in parts)+120)
    height=sum(p.height for p in parts)+80+40*(len(parts)-1)
    card=Image.new('RGB',(width,height),'white'); y=40
    for p in parts:
        card.paste(p,((width-p.width)//2,y)); y+=p.height+40
    dest=OUT/f'{id}.png'; card.save(dest)
    return {'id':id,'role':role,'tag':role,'path':str(dest.relative_to(ROOT)),'sha256':sha(dest),'script':script,'words':words,'font':font,'fontSha256':expected,'fontLicense':'OFL-1.1','shaping':shaped,'preflight':'pending','roleDescription':'Lettering style only; sample words are not customer identity.' if role=='lettering' else 'Exact spelling and reading order only; not a pendant silhouette.'}

def hardware():
    size=1100; scale=2.7; offset=np.array([550,760]); light=np.array([-.4,-.5,.76]); light/=np.linalg.norm(light)
    canvas=np.full((size,size,3),250,dtype=np.uint8); depth=np.full((size,size),-1e9)
    def cloud(p,c):
        ix=np.rint((p[:,0]+.48*p[:,2])*scale+offset[0]).astype(int)
        iy=np.rint((p[:,1]-.22*p[:,2])*scale+offset[1]).astype(int)
        dep=p[:,2]+.01*p[:,1]; order=np.argsort(dep)
        for dx,dy in tuple((dx,dy) for dx in (-1,0,1) for dy in (-1,0,1)):
            sx,sy,sd=ix[order]+dx,iy[order]+dy,dep[order]
            ok=(sx>=0)&(sx<size)&(sy>=0)&(sy<size)
            sx,sy,sd,cc=sx[ok],sy[ok],sd[ok],c[order][ok]
            rev=np.unique((sy*size+sx)[::-1],return_index=True)[1]; choose=len(sx)-1-rev
            sx,sy,sd,cc=sx[choose],sy[choose],sd[choose],cc[choose]
            front=sd>depth[sy,sx]
            canvas[sy[front],sx[front]]=np.clip(cc[front],0,255).astype(np.uint8); depth[sy[front],sx[front]]=sd[front]
    # Integral eyelet and its contiguous neutral attachment tab; no name body.
    yy,xx=np.mgrid[-50:100,-65:66]; radius=np.hypot(xx,yy)
    mask=((radius<=36)&(radius>=20))|((abs(xx)<=27)&(yy>=25)&(yy<=85))
    assert ndimage.label(mask)[1]==1
    bevel=np.clip(ndimage.distance_transform_edt(mask)/4,0,1)
    shade=(.62+.15*bevel)[mask]
    cloud(np.column_stack((xx[mask],yy[mask],np.zeros(mask.sum()))),np.repeat((shade*210)[:,None],3,axis=1))
    def torus(cy,radius,plane):
        t,p=np.meshgrid(np.linspace(0,2*np.pi,800,endpoint=False),np.linspace(0,2*np.pi,72,endpoint=False)); t=t.ravel();p=p.ravel();radial=radius+4.8*np.cos(p)
        if plane=='xy':
            pts=np.column_stack((radial*np.cos(t),cy+radial*np.sin(t),4.8*np.sin(p)))
            normals=np.column_stack((np.cos(p)*np.cos(t),np.cos(p)*np.sin(t),np.sin(p)))
        else:
            pts=np.column_stack((4.8*np.sin(p),cy+radial*np.cos(t),radial*np.sin(t)))
            normals=np.column_stack((np.sin(p),np.cos(p)*np.cos(t),np.cos(p)*np.sin(t)))
        shade=np.clip(normals@light*.45+.50,.17,.99)
        cloud(pts,np.repeat((shade*210)[:,None],3,axis=1))
    torus(-29,29,'yz')
    for k in range(5): torus(-63-k*29,22,'xy' if k%2==0 else 'yz')
    dest=OUT/'hardware.png';Image.fromarray(canvas).save(dest)
    return {'id':'hardware','role':'hardware','tag':'hardware','path':str(dest.relative_to(ROOT)),'sha256':sha(dest),'preflight':'pending','roleDescription':'One integral body eyelet, separate perpendicular closed connector and first alternating cable links. Relationship only; not pendant outline. Apply at both body attachments.','geometry':{'bodyComponents':1,'eyeletOuterRadius':36,'eyeletBoreRadius':20,'connectorCenterY':-29,'connectorRadius':29,'tubeRadius':4.8,'firstLinkCenterY':-63,'firstLinkRadius':22,'units':'reference pixels, not mm','projection':'oblique z-buffer; visible front/behind'},'limitations':['Visual relationship specimen, not manufacturing CAD or strength certification.']}

if __name__=='__main__':
    (OUT/'source').mkdir(parents=True,exist_ok=True)
    refs=[text_card('lettering-ar','Arabic',['مريم','فاطمة','جلال','أمينة'],'lettering'),text_card('lettering-en','English',['Amelia','George','Sophia','James'],'lettering'),hardware()]
    refs += [text_card('spelling-'+id,script,[name],'spelling') for id,script,name in NAMES]
    manifest={'version':'2.0.0','rendererSha256':sha(Path(__file__)),'renderer':run(['/opt/homebrew/bin/hb-view','--version']),'referenceGenerationCredits':0,'references':refs}
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'referenceCount':len(refs),'status':'pending_visual_preflight','path':str(OUT)}))
