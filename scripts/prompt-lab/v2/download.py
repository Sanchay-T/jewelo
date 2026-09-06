"""Download original provider output. URLs stay in stdin/runtime, not artifacts."""
from pathlib import Path
import hashlib,json,sys,urllib.request
from PIL import Image
root=Path(__file__).resolve().parents[3]/'reviews/2026-09-06-creative-name-v2'
d=json.load(sys.stdin);name=d['filename']
if Path(name).name!=name or not name.endswith('.png'):raise ValueError('invalid_output_filename')
dest=root/'outputs'/name;dest.parent.mkdir(exist_ok=True)
existing=dest.exists()
if existing:data=dest.read_bytes()
else:
 try:
  with urllib.request.urlopen(d['url'],timeout=90) as response: data=response.read()
 except Exception:
  raise RuntimeError('provider_output_download_failed') from None
import io
with Image.open(io.BytesIO(data)) as image:
 width,height=image.size;format=image.format;image.verify()
if width<=0 or height<=0:raise ValueError('invalid_image_dimensions')
if not existing:
 with dest.open('xb') as f:f.write(data)
print(json.dumps({'output':str(dest.relative_to(root)),'outputHash':hashlib.sha256(data).hexdigest(),'width':width,'height':height,'format':format,'bytes':len(data)}))
