from pathlib import Path
import json,io,base64,html
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
P=Path(__file__).resolve().parent/'review-artifacts/inline-stat-icon-production';D=json.loads((P/'measurements.json').read_text());S=D['summary']
ids=['recruit','attack','thor','consecutive','centering','dense','smaller']
def n(x):return '-'if x is None else f'{x:.2f}'.rstrip('0').rstrip('.')
def jpg(im):
 b=io.BytesIO();im.convert('RGB').save(b,format='JPEG',quality=95);return b.getvalue()
def uri(im):return 'data:image/jpeg;base64,'+base64.b64encode(jpg(im)).decode()
def rows(r):return [('Effective rules font',n(r['fontSize'])),('Line count / origins',str(len(r['lines']))+' / '+', '.join(n(l['y'])for l in r['lines'])),('Rules painted / logical height',n(r['paintedHeight'])+' / '+n(r['logicalHeight'])),('Rules overflow vertical / horizontal',n(r['overflow']['vertical'])+' / '+n(r['overflow']['horizontal'])),('Protected / fallback blocks',str(sum(b['protected']for b in r['blocks']))+' / '+str(sum(b['fallback']for b in r['blocks']))),('Flavor origin / size',n(r['flavor']['y'])+' / '+n(r['flavor']['font'])),('Flavor painted bottom',n(r['flavor']['painted']['bottom'])),('Flavor clipping extent / fully clipped',n(r['flavor']['placement']['paintedBottomBeyondClip'])+' / '+str(r['flavor']['placement']['fullyClipped']))]
notes=[
'BEFORE: accepted commit a8232b2, ability stat scale1.72. AFTER: working production, ability stat scale1.60. Identical content, assets, cost8 without asterisk, requested font controls and export scale2. This is the actual implementation, not another three-way diagnostic.',
'Only Attack/Recruit ability placements change. Ordinary line-height basis remains1.72, class scale remains1.28, and Phase2.6 font-relative centering and clearance are unchanged. Large stats/cost graphics, rules/flavor/contour geometry and fitting policies are unchanged.',
f"Actual production matches the accepted isolated1.60 path in {S['diagnosticPixelMatches']} pixel comparisons: {S['corpusCompared']} existing corpus cards plus9 focused fixtures. All positioned corpus diagnostics/direct metrics match too. The existing corpus covers Hero, split, Villain, Mastermind, Location, Henchman, Trap and Scheme.",
f"Against a8232b2: {S['corpusSame']} corpus images identical / {S['corpusChanged']} changed; all9 focused images change as expected. Smaller stat icons and resolved line origins are intentional. No new clipping/collision in focused fixtures. Shared-path changes are expected in other families; no family geometry was recalibrated.",
'Accepted fitting changes: mixed-icon prose moves one word onto the preceding line. The uppercase/lowercase phrase becomes a protected single line at font19 instead of two lines at22: width328.46 fits within330. No phrase-specific exception was added.',
'Dense rules retain font21 and five lines; their old2.72-unit vertical overflow is recovered. Dense flavor remains fully clipped. Flavor follows the accepted final-rules painted bounds, so its position may move slightly even though its algorithm and typography are unchanged.',
'At font22 icons are35 logical units high instead of38; at font18 they are29 instead of31; at font21 they are34 instead of36. Consecutive icon lines at22 retain1.76 units of clearance. Measurements below are logical card units; images are2x exports.',
'Historical Hero milestone runners explicitly retain their original1.72 icon basis for exact geometry/flavor oracles. The new production runner separately executes the same browser assertions at actual1.60, including focused Hero and flavor checks. See INLINE-STAT-ICON-PRODUCTION-VALIDATION.md for suite counts and scope.'
]
C=canvas.Canvas(str(P/'review.pdf'),pagesize=(1190,842));C.setTitle('Inline stat icons - production before / after')
def text(x,y,s,z=11):C.setFont('Helvetica',z);C.drawString(x,y,s)
def para(s,x,y,w,z=11):
 line=''
 for word in s.split():
  candidate=(line+' '+word).strip()
  if line and C.stringWidth(candidate,'Helvetica',z)>w:text(x,y,line,z);y-=z+4;line=word
  else:line=candidate
 text(x,y,line,z);return y-z-4
def draw(im,x,y,w,h):C.drawImage(ImageReader(io.BytesIO(jpg(im))),x,y,width=w,height=h)
def page(title):text(24,811,title,21);text(24,18,f'Uncommitted production review | BEFORE a8232b2 / AFTER working tree | Page {C.getPageNumber()}',9)
page('Ability Attack / Recruit scale1.60 - production verification');y=771
for s in notes:y=para(s,24,y,1135,12)-17
C.showPage();sections=['<header><h1>Inline stat icons: actual production before / after</h1>'+''.join('<p>'+html.escape(s)+'</p>'for s in notes)+'</header>']
for id in ids:
 pair=next(r for r in D['paired']if r['id']==id);page(pair['after']['fixture']['name']);articles=[]
 for i,side in enumerate(['before','after']):
  r=pair[side];im=Image.open(P/f'{id}-{side}.png');crop=im.crop((180,1000,1008,1400));x=24+i*590
  label=('BEFORE - a8232b2 /1.72'if side=='before'else'AFTER - working production /1.60');text(x,779,label,15);draw(crop,x,502,548,264.73);draw(im,x,233,180,250)
  y=480
  for k,v in rows(r):y=para(k+': '+str(v),x+195,y,363,10)-3
  y-=5
  for j,l in enumerate(r['lines']):
   icons=[f"{a['icon']} H{n(a['height'])} [{n(a['top'])}..{n(a['bottom'])}]"for a in l['items']if'icon'in a]
   y=para(f"L{j+1} ink {n(l['top'])}..{n(l['bottom'])}; previous gap {n(l['previousGap'])}"+(('; '+', '.join(icons))if icons else ''),x+195,y,363,9)
  text(x,205,'Natural rules wraps:',11);y=185
  for l in r['lines']:y=para(l['text'],x,y,548,10)
  articles.append('<article><h3>'+label+'</h3><img src="'+uri(crop)+'"><img class="card" src="'+uri(im)+'"><table>'+''.join('<tr><th>'+html.escape(k)+'</th><td>'+html.escape(str(v))+'</td></tr>'for k,v in rows(r))+'</table><p><b>Natural wraps:</b><br>'+'<br>'.join(html.escape(l['text'])for l in r['lines'])+'</p><details><summary>All icon, line, gap and fitting measurements</summary><pre>'+html.escape(json.dumps(r,indent=2))+'</pre></details></article>')
 C.showPage();sections.append('<section><h2>'+html.escape(pair['after']['fixture']['name'])+'</h2><div class="pair">'+''.join(articles)+'</div></section>')
C.save();(P/'review.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><title>Inline stat icons production review</title><style>body{font:15px system-ui;max-width:1400px;margin:24px auto;padding:0 20px;color:#172d40;background:#edf1f5}p{line-height:1.5}section{background:white;padding:20px;margin:24px 0;break-before:page}.pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px}img{width:100%;height:auto}.card{display:block;max-width:350px;margin:20px auto}table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;border-bottom:1px solid #ddd;padding:6px;overflow-wrap:anywhere}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px}@media print{details{display:none}}</style>'+''.join(sections)+'</html>',encoding='utf8');print('Built8-page production PDF and self-contained HTML.')
