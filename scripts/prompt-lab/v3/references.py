"""R&D input assets, no model calls. Preserve shaped name positions exactly.
The unnamed connection sketch demonstrates relationships, not pendant geometry.
"""
from pathlib import Path
import hashlib, json, subprocess
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'reviews/2026-09-06-arabic-v3-inputs'
FONT=ROOT/'packages/identity/engines/caleums-arabic-v3/fonts/NotoNaskhArabic-Regular.ttf'
PIN='67b5a525a661b607971fbd3f96a81b89d3a768e74534fca84f18ac97e6fab72f'
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def run(args):return subprocess.check_output(args,text=True).strip()

def render_name(item):
    assert sha(FONT)==PIN,'font_bytes_changed'
    folder=OUT/'references';folder.mkdir(exist_ok=True)
    args=[str(FONT),item['identity']['name'],'--direction=rtl','--script=arab','--language=ar','--font-size=360']
    glyphs=json.loads(run(['/opt/homebrew/bin/hb-shape',*args,'--no-glyph-names','--output-format=json']))
    assert glyphs and all(g['g']!=0 for g in glyphs),'missing_glyph'
    stem='name-'+item['identityHash'][:16]
    for ext in ['png','svg']:
        subprocess.run(['/opt/homebrew/bin/hb-view',*args,'--margin=80','--ink','--output-file='+str(folder/(stem+'.'+ext))],check=True)
    path=folder/(stem+'.png')
    return {'id':stem,'role':'name','tag':'name','name':item['identity']['name'],'script':'Arabic','identityHash':item['identityHash'],'fontSha256':PIN,'path':str(path.relative_to(OUT)),'sha256':sha(path),'svgPath':str((folder/(stem+'.svg')).relative_to(OUT)),'shaping':{'tool':run(['/opt/homebrew/bin/hb-view','--version']),'direction':'rtl','script':'arab','language':'ar','fontSize':360,'margin':80,'ink':True,'glyphs':glyphs},'sourcePositionsPreserved':True,'preflight':{'status':'pending','sha256':sha(path)}}

def construction():
    # New procedural relationship specimen. No customer name or identity geometry.
    size=1000; canvas=np.full((size,size,3),250,dtype=np.uint8);depth=np.full((size,size),-1e9)
    scale=2.1;offset=np.array([690,650]);light=np.array([-.4,-.5,.76]);light/=np.linalg.norm(light)
    def cloud(p,c):
        ix=np.rint((p[:,0]+.48*p[:,2])*scale+offset[0]).astype(int);iy=np.rint((p[:,1]-.22*p[:,2])*scale+offset[1]).astype(int)
        dep=p[:,2]+.01*p[:,1];order=np.argsort(dep)
        for dx,dy in [(a,b) for a in (-1,0,1) for b in (-1,0,1)]:
            sx,sy,sd=ix[order]+dx,iy[order]+dy,dep[order];ok=(sx>=0)&(sx<size)&(sy>=0)&(sy<size)
            sx,sy,sd,cc=sx[ok],sy[ok],sd[ok],c[order][ok]
            rev=np.unique((sy*size+sx)[::-1],return_index=True)[1];keep=len(sx)-1-rev
            sx,sy,sd,cc=sx[keep],sy[keep],sd[keep],cc[keep];front=sd>depth[sy,sx]
            canvas[sy[front],sx[front]]=np.clip(cc[front],0,255).astype(np.uint8);depth[sy[front],sx[front]]=sd[front]
    yy,xx=np.mgrid[-50:100,-65:66];radius=np.hypot(xx,yy)
    mask=((radius<=36)&(radius>=20))|((abs(xx)<=27)&(yy>=25)&(yy<=85))
    assert ndimage.label(mask)[1]==1
    shade=(.62+.15*np.clip(ndimage.distance_transform_edt(mask)/4,0,1))[mask]
    cloud(np.column_stack((xx[mask],yy[mask],np.zeros(mask.sum()))),np.repeat((shade*210)[:,None],3,axis=1))
    def ring(cy,r,plane):
        t,p=np.meshgrid(np.linspace(0,2*np.pi,800,endpoint=False),np.linspace(0,2*np.pi,72,endpoint=False));t=t.ravel();p=p.ravel();rad=r+4.8*np.cos(p)
        if plane=='xy':pts=np.column_stack((rad*np.cos(t),cy+rad*np.sin(t),4.8*np.sin(p)));norm=np.column_stack((np.cos(p)*np.cos(t),np.cos(p)*np.sin(t),np.sin(p)))
        else:pts=np.column_stack((4.8*np.sin(p),cy+rad*np.cos(t),rad*np.sin(t)));norm=np.column_stack((np.sin(p),np.cos(p)*np.cos(t),np.cos(p)*np.sin(t)))
        cloud(pts,np.repeat((np.clip(norm@light*.45+.5,.17,.99)*210)[:,None],3,axis=1))
    ring(-29,29,'yz')
    for k in range(4):ring(-63-k*29,22,'xy' if k%2==0 else 'yz')
    # Front-view material fragments; no bowl or other customer-letter silhouette.
    obj=Image.fromarray(canvas);d=ImageDraw.Draw(obj)
    d.rounded_rectangle((295,555,400,670),radius=8,fill=(140,140,140))
    d.line([(238,600),(309,600)],fill=(140,140,140),width=13)
    d.polygon([(210,565),(245,600),(210,635),(175,600)],fill=(148,148,148))
    path=OUT/'references/construction.png';obj.save(path)
    mark_mask=np.any(np.asarray(obj)[:,:450]!=250,axis=2)
    assert ndimage.label(mark_mask)[1]==1,'detached_specimen_mark'
    return {'id':'construction','role':'construction','tag':'construction','customerIdentity':False,'path':str(path.relative_to(OUT)),'sha256':sha(path),'description':'Left: a generic diamond material fragment visibly supported by a short neck to an unnamed metal patch. Right: integral body eyelet, separate connector and alternating chain links. No name, lettering style or finished pendant is specified.','limitations':['Reference sketch, not jewelry engineering certification.','The sample mark is not an instruction to add a mark or alter its position.','Body patches are generic and must not become a backing plate.'],'preflight':{'status':'pending','sha256':sha(path)}}

if __name__=='__main__':
    identities=json.loads((OUT/'identities.json').read_text())
    refs=[render_name(item) for item in identities]
    refs.append(construction())
    (OUT/'reference-manifest.json').write_text(json.dumps({'status':'pending_visual_preflight','rendererHash':sha(Path(__file__)),'modelCalls':0,'references':refs},ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'references':len(refs),'modelCalls':0}))
