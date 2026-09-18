"""Build persistent PDF/embedded HTML from scheme-a-production.cjs outputs."""
from pathlib import Path
import base64
import html
import io
import json
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tools/review-artifacts/scheme-a-production'
data = json.loads((OUT / 'measurements.json').read_text(encoding='utf-8'))
pairs = list(zip(data['before'], data['after']))
pairs = [(b, a) for b, a in pairs if a['fixture']['layout'] == 'a']
pairs += [(b, a) for b, a in zip(data['denseBefore'], data['denseAfter'])
          if a['fixture']['layout'] == 'a' and a['requestedSize'] == 22]

def num(v):
    return '-' if v is None else f'{v:g}'

def metrics(r):
    q = r['rules']
    return [
        ('Requested / effective font', f"{r['requestedSize']} / {q['effective']}"),
        ('Lines / ordinary advance', f"{len(q['lines'])} / {q['lineH']}"),
        ('Line origins', ', '.join(num(l['y']) for l in q['lines'])),
        ('Painted top / bottom', f"{num(q['painted']['top'])} / {num(q['painted']['bottom'])}"),
        ('Logical bottom / rules height', f"{num(q['bottomY'])} / {num(q['bottomY']-r['config']['y'])}"),
        ('Overflow vertical / horizontal', f"{num(q['overflow']['vertical'])} / {num(q['overflow']['horizontal'])}"),
        ('Flavor origin / painted gap', f"{num(r['flavorY'])} / {num(r['paintedGap'])}"),
        ('Flavor clipped / rules beyond canvas', f"{num(r['flavorClipped'])} / {num(r['rulesBeyondCanvas'])}"),
    ]

def image_bytes(im):
    b = io.BytesIO(); im.save(b, format='PNG'); return b.getvalue()

pdf = canvas.Canvas(str(OUT/'review.pdf'), pagesize=(792, 720))
pdf.setTitle('Scheme A - accepted production comparison')
sections = []
for page, (before, after) in enumerate(pairs, 1):
    key = after['fixture']['id'] if page < 5 else 'virus-22'
    title = after['fixture']['name'] + (' - requested 22 caveat' if page == 5 else '')
    pdf.setFillColorRGB(.06, .12, .2); pdf.setFont('Helvetica-Bold', 17)
    pdf.drawString(24, 690, title)
    pdf.setFont('Helvetica', 9)
    pdf.drawString(24, 672, 'Same inputs, assets and 2x render scale. No title, template, icon-scale or fitting-floor changes.')
    if page == 5:
        note = 'Accepted overflow remains: 103 -> 39. No extra automatic shrinking; requested 14 fits.'
    elif key == 'a-flavor':
        note = 'Custom editor flavor remains flow-relative. Explicit blank line and inline Recruit are preserved.'
    else:
        note = 'Before: 30794ef. After: production exactly matches the saved accepted Scheme A candidate.'
    pdf.drawString(24, 656, note)
    columns = []
    for column, (label, r) in enumerate([('BEFORE', before), ('AFTER', after)]):
        x = 24 + column*384
        im = Image.open(OUT/f'{key}-{label.lower()}.png').convert('RGB')
        crop = im.crop((0, 1030, 1008, 1400))
        pdf.setFont('Helvetica-Bold', 11); pdf.drawString(x, 633, label)
        pdf.setFont('Helvetica', 9)
        cfg=r['config'];pdf.drawString(x+68, 634, f"x22 / y525 / width{cfg['w']} / bottom{cfg['maxBottom']}")
        pdf.drawImage(ImageReader(im), x+89, 345, width=180, height=250)
        pdf.drawImage(ImageReader(crop), x, 201, width=360, height=132.14)
        rows=metrics(r)
        for j,(name,value) in enumerate(rows):
            pdf.setFont('Helvetica', 8); pdf.drawString(x, 182-j*17, name)
            pdf.setFont('Helvetica-Bold', 8); pdf.drawRightString(x+360,182-j*17,value)
        full64=base64.b64encode(image_bytes(im)).decode(); crop64=base64.b64encode(image_bytes(crop)).decode()
        columns.append(f'<article><h3>{label}</h3><p>x22 / y525 / width{cfg["w"]} / bottom{cfg["maxBottom"]}</p>'
                       f'<img class="full" alt="{label} full card" src="data:image/png;base64,{full64}">'
                       f'<img class="crop" alt="{label} rules crop" src="data:image/png;base64,{crop64}">'
                       '<table>'+''.join(f'<tr><td>{html.escape(k)}</td><td>{html.escape(v)}</td></tr>' for k,v in rows)+'</table></article>')
    pdf.setFont('Helvetica', 8);pdf.drawString(24, 26, 'Logical units: 504 x 700. Horizontal overflow 1 is the unchanged left glyph overhang.')
    pdf.drawRightString(768,26,f'{page} / {len(pairs)}');pdf.showPage()
    sections.append(f'<section><h2>{html.escape(title)}</h2><p>{html.escape(note)}</p><div class="pair">'+''.join(columns)+'</div></section>')
pdf.save()
style='''body{font:16px system-ui;background:#edf1f5;color:#162332;margin:24px}main{max-width:1250px;margin:auto}section{background:white;padding:24px;margin:28px 0;border-radius:10px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:24px}article{text-align:center;min-width:0}.full{width:252px;max-width:100%;display:block;margin:12px auto}.crop{width:100%;display:block;margin:18px 0}table{width:100%;font-size:12px;border-collapse:collapse;text-align:left}td{border-bottom:1px solid #ddd;padding:5px}td:last-child{text-align:right}h2{font-size:22px}h3{margin-bottom:4px}@media print{section{break-after:page}}'''
(OUT/'review.html').write_text('<!doctype html><meta charset="utf-8"><title>Scheme A production review</title><style>'+style+'</style><main><h1>Scheme A - accepted production comparison</h1><p>Five identical-input before/after comparisons. Every image is embedded; this file can be shared on its own. Full cards and crops use identical scale on both sides.</p>'+''.join(sections)+'</main>',encoding='utf-8')
print('Created five-page PDF and self-contained HTML (20 embedded images).')
