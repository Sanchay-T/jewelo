"""Deterministic R&D reference renderer. Never edits generated photographs.
Preserves the previously reviewed Muhammad glyph mask; no component fusion.
Draws separate toroidal hardware using a depth buffer, not a painted-on cross.
These are visual experimental references, not manufacturing CAD.
"""
from pathlib import Path
import hashlib, json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "reviews/2026-09-06-prompt-system/references"
SOURCE = OUT / "source/muhammad-geometry.png"
SIZE = 1600
SCALE = 0.88
OFFSET = np.array([180, 540])
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def ring(mask, cx, cy, radius=36, bore=20):
    d=ImageDraw.Draw(mask)
    d.ellipse((cx-radius,cy-radius,cx+radius,cy+radius),fill=255)
    d.ellipse((cx-bore,cy-bore,cx+bore,cy+bore),fill=0)
def build(family):
    src = Image.open(SOURCE).convert('L')
    mask = src.point(lambda x:255 if x<128 else 0)
    anchors=[(323,155),(1119,227)]
    details=""
    if family in ('framed','rails'):
        # Remove ONLY the two legacy eyelet disks; glyph positions remain fixed.
        d=ImageDraw.Draw(mask)
        for x,y in anchors:d.ellipse((x-38,y-38,x+38,y+38),fill=0)
        if family=='framed':
            d.rectangle((125,130,1265,485),outline=255,width=18)
            d.rectangle((238,402,256,485),fill=255)
            d.rectangle((1060,375,1078,485),fill=255)
            anchors=[(160,104),(1230,104)]
            details='Open rectangular carrier, two lower support contacts at the broad baseline, no legacy lettering eyelets.'
        else:
            d.rectangle((145,160,1245,178),fill=255)
            d.rectangle((145,470,1245,488),fill=255)
            d.rectangle((314,170,332,219),fill=255)
            d.rectangle((1110,170,1128,279),fill=255)
            d.rectangle((238,402,256,480),fill=255)
            d.rectangle((1060,375,1078,480),fill=255)
            anchors=[(190,134),(1200,134)]
            details='Parallel upper/lower rails with four supports, two upper rail eyelets, no stones or empty seats.'
        for x,y in anchors:ring(mask,x,y)
    elif family=='origami':
        details='Lettering itself has continuous shallow alternating folded planes; no separate folded carrier. The silhouette and original eyelets remain fixed.'
    else:details='Original one-component Muhammad body and its original integral eyelets. No new support bridges.'
    a=np.array(mask)>0
    components=int(ndimage.label(a)[1])
    support_checks=[]
    if family in ('framed','rails'):
        original=np.array(src)<128
        for sid,x,y in [('lower_left',238,402),('lower_right',1060,375)]:
            overlap=int(original[y:y+20,x:x+19].sum())
            support_checks.append({'id':sid,'overlapPixels':overlap,'passed':overlap>=19*8})
        if not all(c['passed'] for c in support_checks): raise ValueError('support_overlap_failed')
    if components!=1: raise ValueError('body_disconnected')
    # A flat body with shallow folded heightfield for the origami candidate.
    h,w=a.shape
    yy,xx=np.indices(a.shape)
    z=np.zeros(a.shape,dtype=float)
    if family=='origami':
        phase=((xx-185)%180)/180
        z=14*(1-np.abs(2*phase-1))
    # Normals of continuous surface; distance-to-edge bevel only for shading.
    distance=ndimage.distance_transform_edt(a)
    bevel=np.clip(distance/5,0,1)
    dzdy,dzdx=np.gradient(z)
    normal=np.dstack((-dzdx,-dzdy,np.ones_like(z)))
    normal/=np.linalg.norm(normal,axis=2)[...,None]
    light=np.array([-0.4,-0.5,0.76]);light/=np.linalg.norm(light)
    brightness=np.clip((normal@light)*0.5+0.38,0.2,0.98)*(0.65+0.35*bevel)
    base=np.stack([brightness*195,brightness*190,brightness*180],axis=-1)
    points=np.column_stack((xx[a],yy[a],z[a]))
    colors=base[a]
    path=OUT/family;path.mkdir(parents=True,exist_ok=True)
    mask.save(path/'body-mask.png')
    def render(assembly):
        canvas=np.full((SIZE,SIZE,3),250,dtype=np.uint8)
        depth=np.full((SIZE,SIZE),-1e9)
        def cloud(p,c):
            # Front oblique projection exposes the perpendicular hardware.
            px=(p[:,0]+0.36*p[:,2])*SCALE+OFFSET[0]
            py=(p[:,1]-0.18*p[:,2])*SCALE+OFFSET[1]
            dep=p[:,2]+0.01*p[:,1]
            ix=np.rint(px).astype(int);iy=np.rint(py).astype(int)
            order=np.argsort(dep)
            # Rendering back-to-front with 2x2 splats closes raster sampling holes.
            for dx,dy in ((0,0),(1,0),(0,1),(1,1)):
                sx=ix[order]+dx;sy=iy[order]+dy;sd=dep[order]
                ok=(sx>=0)&(sx<SIZE)&(sy>=0)&(sy<SIZE)
                sx,sy,sd,cc=sx[ok],sy[ok],sd[ok],c[order][ok]
                # Keep the maximum-depth point per projected pixel.
                flat=sy*SIZE+sx
                rev=np.unique(flat[::-1],return_index=True)[1]
                chosen=len(flat)-1-rev
                sx,sy,sd,cc=sx[chosen],sy[chosen],sd[chosen],cc[chosen]
                front=sd>depth[sy,sx]
                canvas[sy[front],sx[front]]=np.clip(cc[front],0,255).astype(np.uint8)
                depth[sy[front],sx[front]]=sd[front]
        cloud(points,colors)
        if assembly:
            def torus(cx,cy,radius,plane):
                theta=np.linspace(0,2*np.pi,320,endpoint=False)
                phi=np.linspace(0,2*np.pi,32,endpoint=False)
                t,p=np.meshgrid(theta,phi);t=t.ravel();p=p.ravel()
                radial=radius+4.8*np.cos(p)
                if plane=='xy':
                    pts=np.column_stack((cx+radial*np.cos(t),cy+radial*np.sin(t),4.8*np.sin(p)))
                    normals=np.column_stack((np.cos(p)*np.cos(t),np.cos(p)*np.sin(t),np.sin(p)))
                else:
                    pts=np.column_stack((cx+4.8*np.sin(p),cy+radial*np.cos(t),radial*np.sin(t)))
                    normals=np.column_stack((np.sin(p),np.cos(p)*np.cos(t),np.cos(p)*np.sin(t)))
                shade=np.clip(normals@light*0.45+0.50,0.17,0.99)
                color=np.column_stack((shade*210,shade*205,shade*195))
                cloud(pts,color)
            for x,y in anchors:
                # Linking condition: connector crosses the eyelet hole at its
                # lower z=0 crossing; its other z=0 crossing lies outside the body.
                torus(x,y-29,29,'yz')
                for k in range(32):
                    torus(x,y-63-k*29,22,'xy' if k%2==0 else 'yz')
        return Image.fromarray(canvas)
    render(False).save(path/'body.png')
    render(True).save(path/'assembly.png')
    info={'family':family,'sourceSha256':sha(SOURCE),'source':'source/muhammad-geometry.png',
      'bodyMaskHash':sha(path/'body-mask.png'),'bodyHash':sha(path/'body.png'),'assemblyHash':sha(path/'assembly.png'),
      'geometryHash':sha(path/'body-mask.png'),'components':components,'componentMoves':0,'supportChecks':support_checks,
      'eyelets':[{'x':x,'y':y,'outerRadiusPx':36,'boreRadiusPx':20} for x,y in anchors],
      'coordinateUnits':'reference pixels, not mm','physicalDimensionsVerified':False,
      'constructionDetail':details,'foldHeightPixels':14 if family=='origami' else 0,
      'status':'pending_visual_preflight',
      'limitations':['Experimental appearance geometry; no manufacturing strength certification.',
        'Source mask comes from prior reviewed artifact; original font/shaping lineage is inherited, not re-typeset.',
        'Complete assembly reference shows pendant and initial chain links, not clasp or measured full necklace.']}
    (path/'geometry.json').write_text(json.dumps(info,indent=2)+'\n')
    return info
if __name__=='__main__':
    infos=[build(f) for f in ['classical','framed','rails','origami']]
    sheet=Image.new('RGB',(1600,1600),'white')
    for i,f in enumerate(['classical','framed','rails','origami']):
        im=Image.open(OUT/f/'assembly.png').resize((800,800))
        sheet.paste(im,((i%2)*800,(i//2)*800))
    sheet.save(OUT/'preflight-contact-sheet.png')
    print(json.dumps([{'family':i['family'],'components':i['components'],'status':i['status']} for i in infos]))
