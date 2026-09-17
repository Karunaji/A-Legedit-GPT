from pathlib import Path
import json,io,base64,html,hashlib,subprocess
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
R=Path(__file__).resolve().parent.parent; O=R/'tools/review-artifacts/rare-multicolor-hero-production'
saved=json.loads((O/'measurements.json').read_text()); p={'results':[]};
for a,b in zip(saved['before'],saved['after']):
 a={**a,'mode':'A'};b={**b,'mode':'B'};p['results'].extend([a,b])
esc=html.escape
sections=[('Rare multicolor production routing', 'Actual production after the narrow routing change is pixel-identical and measurement-identical to all six saved Candidate B fixtures. BEFORE is Git8f3e0fa; AFTER is the working renderer. This is implementation validation, not another calibration.'), ('Production scope', 'render.js explicitly selects rare single-color OR rare multicolor for the existing contour and layout options. No constants or algorithms are duplicated. Split dispatch remains separate. Width330, origin108/526,27/22 ordinary advance, flavor target648, minimum painted gap6 and full-band3-unit contour margin are reused unchanged. Ability stat scale1.60 and all fitting policies remain unchanged.'), ('Preserved routes', 'Sixteen actual production before/after pixel and complete diagnostic comparisons cover single common/uncommon/rare, multicolor common/uncommon, and split common/uncommon/rare, each with stats OFF/ON. All are identical. Six rare-multicolor stat-toggle checks preserve complete layout. Three class pairs, costs4/8/12, stars and no-flavor controls match the saved oracle.'), ('Expected visible changes', 'Five of six before/after cards change; the short no-flavor card is identical. Medium retains three lines with tighter vertical origins. Crowded retains six lines/font21 and improves logical overflow32 to14; flavor remains wholly clipped. Short flavor reaches painted648. Long flavor recovers8.73 clipping and uses the6-unit gap fallback. Icons change2 to3 lines/font22 with safe badge clearance. Font decisions are identical to saved B. Existing1-unit left glyph overhang is retained in the icon fixture.'), ('Review interpretation', 'The minimum full-band candidate badge clearance across intersecting representative rules/flavor bands is12.18, above3. No new overflow/clipping occurs in these six fixtures. Null clearance means no vertical-band intersection. The prior official sign-off accepted the transfer; dense2022 King Black Panther at requested22 still overflows, while requested16 fits. No card-specific fitting exception was introduced.'), ('Tests and historical oracles', 'The new permanent runner uses repository-contained saved Candidate B inputs plus Git8f3e0fa. Existing Hero geometry/flavor/icon historical runners explicitly retain their original rare-multicolor routing for those milestone comparisons; no numeric assertions were loosened. Actual new routing is tested separately against full saved images/measurements and excluded-route baselines. Historical icon basis remains1.72 where already documented. Logs and the permanent validation document record suite totals.'), ('Deferred work', 'Common/uncommon multicolor and single-color baked-badge contours remain deferred. Split remains separate. No persistence, UI, badge/stat/class placement or non-Hero production code changes. This work is left unstaged and uncommitted.')]
refs=[('Secret Wars Volume 2','https://www.legendarycardgame.com/secret-wars-volume-2'),('Secret Wars Volume 1','https://www.legendarycardgame.com/secret-wars-volume-1'),('Black Panther','https://www.legendarycardgame.com/black-panther'),('Upper Deck multiclass confirmation','https://upperdeck.com/legendary-black-panther-card-preview-empowered-by-science-and-nature/')]
def n(v): return 'n/a' if v is None else f'{v:.2f}'.rstrip('0').rstrip('.')
def detail(r):
 a=r['rules']; f=r['flavor']; s=[f"Rules font requested/effective {n(a['requested'])}/{n(a['effective'])}; {len(a['lines'])} lines",'Origins: '+', '.join(n(l['y']) for l in a['lines']),'Widths: '+', '.join(n(l['width']) for l in a['lines']),f"Rules painted {n(a['painted']['top'])}..{n(a['painted']['bottom'])}; logical bottom {n(a['logicalBottom'])}",f"Rules overflow V/H {n(a['overflow']['vertical'])}/{n(a['overflow']['horizontal'])}; badge clearance {n(a['clearance']['minimum'])}"]
 if f:s += [f"Flavor font requested/effective {n(f['requested'])}/{n(f['effective'])}; {len(f['lines'])} lines",f"Flavor origin {n(r['flavorY'])}; painted {n(f['painted']['top'])}..{n(f['painted']['bottom'])}",f"Painted gap {n(r['gap'])}; beyond clip {n(r['clipped'])}; wholly clipped {r['fullyClipped']}",f"Flavor badge clearance {n(f['clearance']['minimum'])}; V/H overflow {n(f['overflow']['vertical'])}/{n(f['overflow']['horizontal'])}"]
 else:s+=['No flavor.']
 return s
md='# Rare multicolor Hero production validation\n\n'+ '\n\n'.join('## '+h+'\n\n'+t for h,t in sections)+'\n\n## Reference acquisition links\n\n'+'\n'.join(f'- [{h}]({u})' for h,u in refs)+'\n\n## Fixture measurements (logical 504 x 700 units)\n'
for r in p['results']:md+='\n### '+r['fixture']['id']+' / '+r['mode']+'\n\n'+'\n'.join('- '+s for s in detail(r))+'\n'
md+='\nExact input HTML, flavor, class pair, cost/star, stats, natural line text, per-line origins/widths/painted bounds, protection decisions and convergence diagnostics are in measurements.json. Null clearance means no intersection with the badge vertical band. review.html embeds all images; PNGs are source images for build-review.py. tools/rare-multicolor-production.cjs uses the local Electron installation; tools/build-rare-multicolor-review.py uses Pillow and ReportLab. Final verification is in final-verification.json and exact Git status in final-git-status.txt.\n'
(O/'REPORT.md').write_text(md,encoding='utf8')
style=ParagraphStyle('body',fontName='Helvetica',fontSize=9,leading=12)
c=canvas.Canvas(str(O/'review.pdf'),pagesize=(820,1060)); c.setTitle('Rare multicolor Hero: production vs transfer')
def para(t,x,y,w,size=9):
 st=ParagraphStyle('x',parent=style,fontSize=size,leading=size*1.3); q=Paragraph(t,st); _,h=q.wrap(w,1000);q.drawOn(c,x,y-h);return y-h-9
def footer():c.setFont('Helvetica',8);c.drawString(30,22,'Production review | baseline8f3e0fa | 504 x 700 logical coordinates');c.drawRightString(790,22,str(c.getPageNumber()));c.showPage()
y=1015
for h,t in sections[:5]:y=para(esc(h),30,y,760,15);y=para(esc(t),30,y,760,11)
footer()
ht=['<!doctype html><meta charset="utf-8"><title>Rare multicolor transfer review</title><style>body{font:16px Arial;background:#eef1f4;margin:24px;color:#192637}section{background:white;padding:20px;margin:24px auto;max-width:1160px}h1,h2{color:#173d62}.pair{display:grid;grid-template-columns:1fr 1fr;gap:24px}img.full{width:252px;display:block;margin:auto}img.crop{width:100%}pre{white-space:pre-wrap;font:13px monospace}summary{cursor:pointer}p{line-height:1.45}</style><h1>Rare multicolor Hero production</h1><p>A: committed8f3e0fa. B: actual production with shared rare routing. Same inputs and image scale.</p>']
ht+=['<section><h2>'+esc(h)+'</h2><p>'+esc(t)+'</p></section>' for h,t in sections]
for i in range(0,len(p['results']),2):
 pair=p['results'][i:i+2];f=pair[0]['fixture']; title=f['id']+' | '+ '/'.join(f['pair'])+' | cost '+str(f['cost'])+('*' if f['star'] else '')+' | stats '+str(f['stats']);para(esc(title),30,1020,760,16);ht+=['<section><h2>'+esc(title)+'</h2><div class="pair">']
 for j,r in enumerate(pair):
  x=30+j*400;label='A - Before /8f3e0fa' if j==0 else 'B - Actual production after';para(label,x,986,360,13)
  im=Image.open(O/(f['id']+'-'+('before' if r['mode']=='A' else 'after')+'.png'));c.drawImage(ImageReader(im),x+54,606,252,350)
  crop=im.crop((0,960,1008,1400));c.drawImage(ImageReader(crop),x,425,360,360*220/504)
  yy=407
  for s in detail(r):yy=para(esc(s),x,yy,360,9)
  def uri(im):
   b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
  ht+=['<div><h3>'+label+'</h3><img class="full" src="'+uri(im)+'"><h4>Lower region (Y480-700)</h4><img class="crop" src="'+uri(crop)+'"><pre>'+esc('\n'.join(detail(r)))+'</pre><details><summary>Natural wraps and complete measured result</summary><pre>'+esc(json.dumps(r,indent=2))+'</pre></details></div>']
 ht+=['</div></section>'];footer()
y=1015
for h,t in sections[5:]:y=para(esc(h),30,y,760,14);y=para(esc(t),30,y,760,10)
footer();c.save()
ht+=['<section><h2>Reference acquisition</h2>'+''.join('<p><a href="'+u+'">'+esc(h)+'</a></p>' for h,u in refs)+'</section>'];(O/'review.html').write_text('\n'.join(ht),encoding='utf8')
print('Created review.pdf, review.html, REPORT.md from existing measurements and images')
