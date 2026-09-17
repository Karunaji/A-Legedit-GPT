"""Build persistent committed-before / working-tree-after flavor review.
Run after tools/hero-flavor-production.cjs. Requires Pillow and ReportLab.
"""
from pathlib import Path
import json,io,base64,html
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
P=Path(__file__).resolve().parent/'review-artifacts/rare-hero-flavor-production'
D=json.loads((P/'measurements.json').read_text());S=D['summary']
rows=[r for r in D['paired'] if r['key'].endswith('__8__false')]
def n(v):return '-' if v is None else f'{v:.2f}'.rstrip('0').rstrip('.')
def jpg(im):
 b=io.BytesIO();im.convert('RGB').save(b,format='JPEG',quality=92);return b.getvalue()
def uri(im):return 'data:image/jpeg;base64,'+base64.b64encode(jpg(im)).decode()
def table(head,rs):return '<table><tr>'+''.join('<th>'+html.escape(str(x))+'</th>' for x in head)+'</tr>'+''.join('<tr>'+''.join('<td>'+html.escape(str(x))+'</td>' for x in row)+'</tr>' for row in rs)+'</table>'
paras=[
'BEFORE: committed production at 35a9302. AFTER: working-tree rare single-color Hero flavor implementation. Identical content, assets, cost 8 (no asterisk), font inputs and render scale. Full-card and lower-region images are shown at matching scales. All work remains uncommitted.',
'Only rare single-color Hero flavor changes: preferred painted bottom 648; at least six painted units below rules; actual badge/number contour with full-painted-band three-unit clearance. Nominal flavor width stays 360; original font family, selected size, line advance and clipping remain.',
'The existing fitter is retained, including legacy flavor measurements, font-floor behavior and flavor-driven rules shrinking. Only afterward is flavor positioned against the exact selected final rules. New flavor placement never triggers another rules wrap or font choice.',
f"Validation against 35a9302: {len(S['corpusSame'])} / {len(S['corpusSame'])+len(S['corpusChanged'])} corpus images identical; {len(S['rulesSame'])} isolated focused rules images identical; all 58 focused rules records unchanged. Focused full cards: {len(S['same'])} identical / {len(S['changed'])} changed. {S['checks']} focused assertions and {len(D['direct'])} direct layouts. Existing phase and Hero suites also passed; see the permanent validation report.",
f"Newly overflowing cases: {len(S['newlyOverflowing'])}; newly clipped: {len(S['newlyClipped'])}; recovered clipping: {len(S['recoveredClipping'])} (the long fixture at costs 0/8/12, each with and without asterisk). Crowded flavor remains fully clipped. It is not specially rescued.",
'All seven normal flavor fixtures across six cost/asterisk states converge to the preferred target before any required gap fallback. Two extra-long direct probes cycle in the vertical target iteration; they retain the closest measured contour-valid trial and explicitly report targetConverged=false. This is a finite numerical fallback, not evidence that no better legal layout exists. No font/rules changes are made to hide it.',
'Inspect short/medium/three-line flavor for lower-band consistency, long flavor for recovered clipping, and the Thor-like fixture for realistic inline-icon rules. Crowded and no-flavor control cards should look unchanged. One-line flavor remains an extrapolation beyond the two-/three-line modern reference sample.',
'Measurements are logical card units (504 x 700). Clipping edge is actual Y666, retained from existing code. Bottom-beyond-clip is an extent, not a count of removed pixels. Minimum badge clearance uses the complete painted band expanded vertically by three units. Full data, costs/asterisks and direct probes are in measurements.json.'
]
def metrics(r):
 f=r['flavor'];rules=r['rules']
 return [('Rules size / lines',n(rules['fontSize'])+' / '+str(len(rules['lines']))),('Rules painted bottom',n(rules['painted']['bottom'])),('Flavor origin',n(r.get('flavorY'))),('Flavor size / lines',(n(f['fontSize'])+' / '+str(len(f['lines']))) if f else 'none'),('Flavor line origins',', '.join(n(l['y']) for l in f['lines']) if f else '-'),('Flavor usable widths',', '.join(n(l['right']-l['left']) for l in f['lines']) if f else '-'),('Painted rules gap',n(r.get('gap'))),('Flavor painted bottom',n(f['painted']['bottom']) if f else '-'),('Vertical / horizontal overflow',n(f['overflow']['vertical'])+' / '+n(f['overflow']['horizontal']) if f else '-'),('Bottom beyond clip edge',n(r.get('clipped'))),('Clipping','fully clipped' if r.get('fullyClipped') else ('partly clipped' if r.get('clipped',0)>0 else 'none')),('Min. expanded-band badge gap',n(r.get('clearance'))),('Target / gap fallback',str(r.get('placement',{}).get('targetReached','-'))+' / '+str(r.get('placement',{}).get('gapFallback','-')))]
c=canvas.Canvas(str(P/'review.pdf'),pagesize=(1190,842));c.setTitle('Rare Hero flavor production - committed before / after')
def txt(x,y,t,size=11):c.setFont('Helvetica',size);c.drawString(x,y,t)
def wrap(s,width,size=12):
 result=[];line=''
 for word in s.split():
  test=(line+' '+word).strip()
  if line and c.stringWidth(test,'Helvetica',size)>width:result.append(line);line=word
  else:line=test
 return result+[line]
def page(title):
 c.setFillColorRGB(.08,.17,.25);txt(26,805,title,22);c.setFillColorRGB(.1,.1,.1);txt(26,18,'Uncommitted review | BEFORE 35a9302 / AFTER working tree | '+str(c.getPageNumber()),9)
def draw(im,x,y,w,h):c.drawImage(ImageReader(io.BytesIO(jpg(im))),x,y,width=w,height=h)
page('Rare single-color Hero flavor - production review');y=766
for t in paras:
 for line in wrap(t,1120,13):txt(26,y,line,13);y-=19
 y-=16
c.showPage()
sections=['<header><h1>Rare Hero flavor: production before / after</h1>'+''.join('<p>'+html.escape(t)+'</p>' for t in paras)+'</header>']
for r in rows:
 name=r['after']['fixture']['name'];page(name);articles=[]
 for i,label in enumerate(['before','after']):
  item=r[label];im=Image.open(P/(r['key']+'-'+label+'.png'));crop=im.crop((180,1000,1008,1400));x=26+590*i
  txt(x,770,label.upper()+(' - 35a9302' if i==0 else ' - working tree'),16)
  draw(im,x,434,230,319.45);draw(crop,x+245,597,315,152.17)
  txt(x+245,580,'Lower-region crop - identical scale',10);yy=553
  for key,val in metrics(item):txt(x+245,yy,key+': '+val,10);yy-=16
  txt(x,395,'Rules wraps (unchanged):',12);yy=374
  for line in item['rules']['lines']:
   for part in wrap(n(line['y'])+'  '+line['text'],550,10):txt(x,yy,part,10);yy-=14
  yy-=14;txt(x,yy,'Flavor wraps:',12);yy-=19
  if item['flavor']:
   for line in item['flavor']['lines']:
    for part in wrap(n(line['y'])+'  '+line['text'],550,10):txt(x,yy,part,10);yy-=14
  else:txt(x,yy,'No flavor.',10)
  articles.append('<article><h3>'+label.upper()+'</h3><img class="full" src="'+uri(im)+'"><img src="'+uri(crop)+'">'+table(['Measurement','Value'],metrics(item))+'</article>')
 c.showPage();sections.append('<section><h2>'+html.escape(name)+'</h2><div class="pair">'+''.join(articles)+'</div><details><summary>Exact positioned lines and fitting diagnostics</summary><pre>'+html.escape(json.dumps(r,indent=2))+'</pre></details></section>')
c.save()
(P/'review.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><title>Rare Hero flavor production review</title><style>body{font:15px system-ui;color:#172d40;background:#edf1f5;max-width:1400px;margin:24px auto;padding:0 20px}p{line-height:1.5}.pair{display:grid;grid-template-columns:1fr 1fr;gap:25px}section{background:white;border:1px solid #ccd4df;margin:24px 0;padding:20px;break-before:page}img{width:100%;display:block;margin:14px 0}.full{max-width:400px;margin:14px auto}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;border-bottom:1px solid #d8dfe7;padding:6px}pre{white-space:pre-wrap;font-size:12px}details{margin-top:18px}@media print{details{display:none}section{border:0}body{background:white}}</style>'+''.join(sections)+'</html>',encoding='utf8')
print(json.dumps({'pages':len(rows)+1,'fixtures':len(rows),'pdf':str(P/'review.pdf'),'html':str(P/'review.html')},indent=2))
