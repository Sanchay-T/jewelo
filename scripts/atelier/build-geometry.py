#!/usr/bin/env python3
"""Build fixed exemplar SVG outlines. Build-only deps: fonttools==4.59.0 uharfbuzz==0.51.0.
Run: python scripts/atelier/build-geometry.py [--font-cache /tmp/atelier-fonts]
Pinned source URLs and SHA256 hashes are in geometry/v1/font-sources.json.
Fonts are downloaded only during this explicit authoring step, never by the web app.
"""
import argparse, hashlib, io, json, math, urllib.request
from pathlib import Path
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'apps/web/public/atelier/geometry/v1'
STYLES={
 'english':{'classic':'playball','minimal':'montserrat','diwani':'greatvibes','kufi':'cinzel','signature':'allura','thuluth':'italianno'},
 'arabic':{'classic':'amiri','minimal':'notosansarabic','diwani':'arefruqaa','kufi':'reemkufi','signature':'lateef','thuluth':'scheherazadenew'},
}
NAMES={'english':{'asma':'Asma','fatima':'Fatima'},'arabic':{'asma':'أسماء','fatima':'فاطمة'}}

def main():
 args=argparse.ArgumentParser();args.add_argument('--font-cache',default='/tmp/atelier-fonts');args.add_argument('--contact-sheet',action='store_true');args=args.parse_args()
 cache=Path(args.font_cache);cache.mkdir(parents=True,exist_ok=True)
 sources=json.loads((OUT/'font-sources.json').read_text())
 manifest={'version':1,'coordinateSystem':'SVG x-right, y-down; viewBox tight ink bounds; width 1000 units, proportional height. Filled contours preserve counters. No live text.',
 'names':NAMES,'lineage':'Deterministic HarfBuzz shaping of pinned OFL fonts; no AI-generated geometry.',
 'styleScope':'Style IDs retain UI vocabulary. Diwani and Thuluth are inspired catalogue categories, not claims of authentic historical calligraphic execution. English uses distinct Latin faces.',
 'assembly':'Outlines are typographic components, not a single casting. Renderer must connect separated bodies and diacritics with rear support bridge and visible narrow uprights; do not remove Arabic dots or hamza.',
 'assets':[]}
 for language,styles in STYLES.items():
  for style,family in styles.items():
   src=sources['fonts'][family]; path=cache/src['filename']
   if not path.exists(): path.write_bytes(urllib.request.urlopen(src['source']).read())
   raw=path.read_bytes()
   assert hashlib.sha256(raw).hexdigest()==src['sha256'],f'Font checksum failed: {family}'
   font=TTFont(io.BytesIO(raw)); axes={}
   if 'fvar' in font:
    axes={a.axisTag:(600 if a.axisTag=='wght' else a.defaultValue) for a in font['fvar'].axes}
    font=instantiateVariableFont(font,axes,inplace=False)
   binary=io.BytesIO();font.save(binary)
   hfont=hb.Font(hb.Face(binary.getvalue()));hfont.scale=(font['head'].unitsPerEm,)*2;hb.ot_font_set_funcs(hfont)
   gs=font.getGlyphSet();order=font.getGlyphOrder()
   for key,name in NAMES[language].items():
    buf=hb.Buffer();buf.add_str(name);buf.guess_segment_properties();hb.shape(hfont,buf,{'kern':True,'liga':True,'calt':True})
    items=[]; x=y=0; bounds=[]
    for info,pos in zip(buf.glyph_infos,buf.glyph_positions):
     assert info.codepoint!=0,f'Missing glyph in {family}: {name}'
     glyph=gs[order[info.codepoint]];dx=x+pos.x_offset;dy=y+pos.y_offset
     pen=BoundsPen(gs);glyph.draw(TransformPen(pen,(1,0,0,1,dx,dy)))
     if pen.bounds: bounds.append(pen.bounds);items.append((glyph,dx,dy))
     x+=pos.x_advance;y+=pos.y_advance
    x0=min(b[0] for b in bounds);y0=min(b[1] for b in bounds);x1=max(b[2] for b in bounds);y1=max(b[3] for b in bounds)
    scale=1000/(x1-x0);height=(y1-y0)*scale
    pen=SVGPathPen(gs)
    for glyph,dx,dy in items: glyph.draw(TransformPen(pen,(scale,0,0,-scale,(dx-x0)*scale,(y1-dy)*scale)))
    d=pen.getCommands();filename=f'{language}-{style}-{key}.svg'
    (OUT/filename).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 {height:.6f}"><title>{name} — {style}</title><path fill="#b38b45" fill-rule="nonzero" d="{d}"/></svg>\n')
    manifest['assets'].append({'file':filename,'language':language,'style':style,'nameKey':key,'spelling':name,'fontFamily':family,'fontSource':src['source'],'fontSha256':src['sha256'],'variationAxes':axes,'viewBox':[0,0,1000,round(height,6)],'baselineY':round(y1*scale,6),'glyphCount':len(items),'sha256':hashlib.sha256((OUT/filename).read_bytes()).hexdigest()})
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 if args.contact_sheet:
  import cairosvg
  from PIL import Image,ImageDraw
  sheet=Image.new('RGB',(1500,1800),'#faf6ef');draw=ImageDraw.Draw(sheet)
  for i,asset in enumerate(manifest['assets']):
   row,col=divmod(i,4);x=col*375;y=row*300
   im=Image.open(io.BytesIO(cairosvg.svg2png(url=str(OUT/asset['file']),output_width=325))).convert('RGBA');im.thumbnail((325,215))
   sheet.paste(im,(x+25,y+45+(215-im.height)//2),im)
   draw.text((x+15,y+10),asset['file'].removesuffix('.svg'),fill='#222222')
  sheet.save(OUT/'contact-sheet.png')
 print(f'Built {len(manifest["assets"])} fixed outline SVGs in {OUT}')
if __name__=='__main__':main()
