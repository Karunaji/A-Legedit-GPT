from pathlib import Path
import io,base64,json
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
p=Path(__file__).parent
metrics=json.loads((p/'results.json').read_text())['metrics']
c=canvas.Canvas(str(p/'review.pdf'),pagesize=(1100,850))
doc=['<!doctype html><meta charset="utf-8"><title>Ability divider review</title><style>body{font:16px Arial;margin:24px}section{page-break-after:always}.grid{display:flex;gap:24px}.grid>div{width:48%}img{width:100%}</style><h1>Ability divider</h1><p>Synthetic examples: existing explicit break versus inserted horizontal divider. Same font, content and geometry. The divider occupies its own line and respects available width.</p>']
def jpg(im):
 b=io.BytesIO();im.save(b,format='JPEG',quality=92);return b.getvalue()
for n,family in enumerate(['common','rare','rare-badge'],1):
 c.setFont('Helvetica-Bold',22);c.drawString(24,816,'Ability divider - '+family)
 doc.append('<section><h2>'+family+'</h2><div class="grid">')
 for col,mode in enumerate(['before','after']):
  key=family+'-'+mode;im=Image.open(p/(key+'.png')).convert('RGB');im=im.resize((1008,1400));crop=im.crop((0,960,1008,1400))
  x=24+col*546;label='Before: explicit line break' if mode=='before' else 'After: divider between sections'
  c.setFont('Helvetica-Bold',14);c.drawString(x,786,label)
  c.drawImage(ImageReader(io.BytesIO(jpg(im))),x+110,365,width=272.16,height=378)
  c.drawImage(ImageReader(io.BytesIO(jpg(crop))),x,122,width=510,height=222.6)
  m=metrics[key];c.setFont('Helvetica',12);c.drawString(x,95,'Font: %s | Logical overflow: %.2f'%(m['font'],m['overflow']['vertical']))
  if m['divider']:c.drawString(x,75,'Divider width: %.2f | Height: 1 logical unit'%m['divider'][0]['width'])
  doc.append('<div><h3>'+label+'</h3>')
  for pic in [im,crop]:doc.append('<img src="data:image/jpeg;base64,'+base64.b64encode(jpg(pic)).decode()+'">')
  doc.append('<p>Effective font: '+str(m['font'])+'; vertical overflow: '+str(round(m['overflow']['vertical'],2))+'</p></div>')
 c.setFont('Helvetica',10);c.drawString(24,30,'Divider consumes vertical space; dense cards may need font-size adjustment. No geometry or icon-scale changes.')
 c.showPage();doc.append('</div></section>')
c.save();(p/'review.html').write_text('\n'.join(doc),encoding='utf8')
