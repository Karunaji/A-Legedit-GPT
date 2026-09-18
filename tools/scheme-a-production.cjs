// Run with Electron from a checkout containing checkpoint 30794ef and npm dependencies.
// Saved candidate measurements/images are immutable oracles, never regenerated here.
const {app, BrowserWindow, session, nativeImage} = require('electron');
const fs = require('fs'), path = require('path'), os = require('os');
const assert = require('assert/strict'), crypto = require('crypto');
const {execFileSync} = require('child_process');
const root = path.resolve(__dirname, '..');
const out = process.env.LEGEDIT_REVIEW_OUTPUT || path.join(__dirname, 'review-artifacts/scheme-a-production');
const fixtureDir = path.join(__dirname, 'test-fixtures/scheme-a');
fs.mkdirSync(out, {recursive:true});
const read = file => fs.readFileSync(path.join(fixtureDir, file));
for (const [file, hash] of Object.entries(JSON.parse(read('hashes.json')))) {
  assert.equal(crypto.createHash('sha256').update(read(file)).digest('hex'), hash, 'Saved oracle hash: '+file);
}
const fixtures = JSON.parse(read('fixtures.json')), expected = JSON.parse(read('probe-results.json'));
const files = ['hero-template-config.js','assets.js','keywords.js','state.js','render.js','ui.js'];
const probe = fs.readFileSync(path.join(__dirname, 'scheme-a-browser-probes.js'), 'utf8');
const corpus = fs.readFileSync(path.join(__dirname, 'phase1-browser-probes.js'), 'utf8');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'scheme-a-production-')));
app.disableHardwareAcceleration(); app.on('window-all-closed', ()=>{});
async function run(before) {
  const s = session.fromPartition('scheme-a-production-'+before);
  s.webRequest.onBeforeRequest((d, cb)=>cb({cancel:/\.js(?:[?#]|$)/.test(d.url)||/^https?:/.test(d.url)}));
  const w = new BrowserWindow({show:false, webPreferences:{session:s,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  await w.loadFile(path.join(root,'index.html'));
  const source = files.map(f=>before ? execFileSync('git',['show','30794ef:'+f],{cwd:root,encoding:'utf8'}) : fs.readFileSync(path.join(root,f),'utf8')).join('\n;\n');
  const result = await w.webContents.executeJavaScript('(async()=>{'+source+'\n'+probe+'\n'+corpus+
    '\nconst scheme=await study('+JSON.stringify(fixtures)+'); const families=await phase1BrowserProbes("baseline",false); return {scheme,families};})()',true);
  w.destroy(); return result;
}
const bitmap = url=>nativeImage.createFromDataURL(url).toBitmap();
const clean = ({image, mode, ...r})=>JSON.parse(JSON.stringify(r));
const eq = (a,b)=>bitmap(a).equals(bitmap(b));
const crop = url=>nativeImage.createFromDataURL(url).crop({x:0,y:0,width:1008,height:1040}).toBitmap();
app.whenReady().then(async()=>{try {
  const before=await run(true), after=await run(false);
  const summary={checkpoint:'30794ef',candidatePixels:0,candidateMetrics:0,schemeBPixels:0,schemeBMetrics:0,
    denseCandidateMetrics:0,denseBMetrics:0,titleTemplatePixels:0,nonSchemePixels:0,corpusSchemeBPixels:0,schemeAChanged:[],explicitBreakChecks:0};
  for(let i=0;i<after.scheme.results.length;i++) {
    const a=after.scheme.results[i], b=before.scheme.results[i], f=a.fixture, mode=f.layout==='a'?'candidate':'current';
    const oracle=expected.results.find(r=>r.fixture.id===f.id&&r.mode===mode);
    assert.deepEqual(clean(a),clean(oracle),'Saved metrics: '+f.id);
    assert(bitmap(a.image).equals(nativeImage.createFromPath(path.join(fixtureDir,f.id+'-'+mode+'.png')).toBitmap()),'Saved pixels: '+f.id);
    assert.deepEqual(clean(b),clean(expected.results.find(r=>r.fixture.id===f.id&&r.mode==='current')),'Baseline metrics: '+f.id);
    if(f.layout==='b') { assert.deepEqual(clean(a),clean(b)); assert(eq(a.image,b.image)); summary.schemeBPixels++;summary.schemeBMetrics++; }
    else {
      summary.candidatePixels++;summary.candidateMetrics++;
      assert(crop(a.image).equals(crop(b.image)),'Title/template above ability changed: '+f.id);summary.titleTemplatePixels++;
      assert(a.rules.overflow.vertical<=b.rules.overflow.vertical,'New vertical overflow');
      assert(a.rules.overflow.horizontal<=b.rules.overflow.horizontal,'New horizontal overflow');
      assert(a.flavorClipped<=b.flavorClipped,'New flavor clipping');
      for(const [label,r] of [['before',b],['after',a]])fs.writeFileSync(path.join(out,f.id+'-'+label+'.png'),nativeImage.createFromDataURL(r.image).toPNG());
    }
  }
  for(let i=0;i<after.scheme.dense.length;i++) {
    const a=after.scheme.dense[i], b=before.scheme.dense[i], isA=a.fixture.layout==='a';
    const oracle=expected.dense.find(r=>r.fixture.id===a.fixture.id&&r.requestedSize===a.requestedSize&&r.mode===(isA?'candidate':'current'));
    assert.deepEqual(clean(a),clean(oracle),'Dense oracle '+a.fixture.id+'/'+a.requestedSize);
    assert.deepEqual(clean(b),clean(expected.dense.find(r=>r.fixture.id===b.fixture.id&&r.requestedSize===b.requestedSize&&r.mode==='current')));
    if(isA)summary.denseCandidateMetrics++;else{assert(eq(a.image,b.image));summary.denseBMetrics++;}
    if(isA&&a.requestedSize===14)assert.equal(a.rules.overflow.vertical,0);
    if(isA&&a.requestedSize===22){assert.equal(a.rules.overflow.vertical,39);assert.equal(a.rules.effective,21);
      for(const [label,r]of [['before',b],['after',a]])fs.writeFileSync(path.join(out,'virus-22-'+label+'.png'),nativeImage.createFromDataURL(r.image).toPNG());}
  }
  for(let i=0;i<after.scheme.checks.length;i++){
    const a=after.scheme.checks[i],b=before.scheme.checks[i];
    if(a.fixture.layout==='b')assert.deepEqual(clean(a),clean(b),'Scheme B explicit break layout');
    summary.explicitBreakChecks+=2; // Both versions enforce the full blank-line contract in study().
  }
  for(const [id,image] of Object.entries(after.families.images)) {
    if(id.startsWith('scheme-a-')){if(!eq(image,before.families.images[id]))summary.schemeAChanged.push(id);}
    else {assert(eq(image,before.families.images[id]),'Excluded family pixels: '+id);
      if(id.startsWith('scheme-b-'))summary.corpusSchemeBPixels++;else summary.nonSchemePixels++;}
  }
  fs.writeFileSync(path.join(out,'measurements.json'),JSON.stringify({summary,
    before:before.scheme.results.map(clean),after:after.scheme.results.map(clean),
    denseBefore:before.scheme.dense.map(clean),denseAfter:after.scheme.dense.map(clean),
    breaksBefore:before.scheme.checks.map(clean),breaksAfter:after.scheme.checks.map(clean)},null,2));
  console.log(JSON.stringify(summary,null,2));app.exit(0);
}catch(e){console.error(e.stack);app.exit(1);}});
