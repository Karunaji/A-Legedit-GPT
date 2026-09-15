const {app,BrowserWindow,session,nativeImage}=require('electron');
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),baseline=path.join(root,'tools/test-fixtures/hero-production-baseline');
const calibration=process.argv[2]||path.join(root,'tools/test-fixtures/hero-calibration-330-27');
const fixtures=JSON.parse(fs.readFileSync(path.join(calibration,'measurements.json'))).results.filter(r=>r.width===330&&r.advance===27&&r.model==='contour');
const output=fs.mkdtempSync(path.join(os.tmpdir(),'legedit-hero-production-'));
app.setPath('userData',path.join(output,'profile'));app.disableHardwareAcceleration();app.on('window-all-closed',()=>{});
async function run(current){
 const s=session.fromPartition('hero-focus-'+current+'-'+Date.now());s.webRequest.onBeforeRequest((d,cb)=>cb({cancel:/\.js(?:[?#]|$)/.test(d.url)||/^https?:/.test(d.url)}));
 const win=new BrowserWindow({show:false,webPreferences:{session:s,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
 const errors=[];win.webContents.on('console-message',(_e,l,m)=>{if(l===3&&!m.includes('ERR_BLOCKED_BY_CLIENT'))errors.push(m);});
 await win.loadFile(path.join(root,'index.html'));
 const code=['hero-template-config.js','assets.js','keywords.js','state.js','render.js','ui.js'].map(f=>fs.readFileSync(path.join(current?root:baseline,f),'utf8')).join('\n;\n');
 const probe=fs.readFileSync(path.join(__dirname,'hero-production-browser-probes.js'),'utf8');
 const oldRender=fs.readFileSync(path.join(baseline,'render.js'),'utf8');
 const reference=oldRender.slice(oldRender.indexOf('function drawAdaptiveTextBlock('),oldRender.indexOf('function drawText(')).replace('function drawAdaptiveTextBlock(','function referenceAdaptiveTextBlock(');
 const result=await win.webContents.executeJavaScript('(async()=>{'+code+'\n'+reference+'\n'+probe+'\nreturn await heroProductionChecks('+JSON.stringify(fixtures)+','+current+');})()',true);
 win.destroy();assert.deepEqual(errors,[]);return result;
}
app.whenReady().then(async()=>{try{
 const before=await run(false),after=await run(true),same=[],changed=[],diagnosticSame=[],diagnosticChanged=[],adaptiveDifferences=[],overflowChanges=[];
 for(const [name,src]of Object.entries(before.images)){
  const a=nativeImage.createFromDataURL(src),b=nativeImage.createFromDataURL(after.images[name]);
  (a.toBitmap().equals(b.toBitmap())?same:changed).push(name);
  for(const [label,img]of [['before',a],['after',b]])fs.writeFileSync(path.join(output,name+'-'+label+'.png'),img.toPNG());
 }
 for(const f of fixtures){
  if(f.fontSize!==22)continue;
  const actual=after.results['fixed__'+f.name].ability;
  assert.deepEqual(actual.lines.map(l=>l.text),f.lines.map(l=>l.text),'Diagnostic wrap: '+f.name);
  assert.deepEqual(actual.lines.map(l=>l.y),f.lines.map(l=>l.y),'Diagnostic origins: '+f.name);
  const a=nativeImage.createFromPath(path.join(calibration,f.id+'.png')),b=nativeImage.createFromDataURL(after.images['fixed__'+f.name]);
  (a.toBitmap().equals(b.toBitmap())?diagnosticSame:diagnosticChanged).push(f.name);
  const adaptive=after.results['adaptive__'+f.name];
  if(JSON.stringify(adaptive.ability.lines.map(l=>l.text))!==JSON.stringify(f.lines.map(l=>l.text)))adaptiveDifferences.push({name:f.name,size:adaptive.ability.size,referenceSize:22,lines:adaptive.ability.lines});
 }
 for(const [name,r]of Object.entries(after.results))if(name.startsWith('adaptive__')){
  const prev=before.results[name];overflowChanges.push({name,before:prev.ability.overflow,after:r.ability.overflow,beforeSize:prev.ability.size,afterSize:r.ability.size,beforeFlavor:prev.flavor,afterFlavor:r.flavor});
 }
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({checks:after.checks,same,changed,diagnosticSame,diagnosticChanged,adaptiveDifferences,overflowChanges,before:before.results,after:after.results,direct:after.direct},null,2));
 fs.writeFileSync(path.join(output,'review.html'),'<!doctype html><meta charset="utf-8"><style>body{font:16px system-ui}section{display:flex;gap:15px}img{max-width:48%;object-fit:contain}</style><h1>Phase 2.6 / rare Hero production</h1>'+Object.keys(after.images).filter(n=>n.startsWith('adaptive__')).map(n=>'<h2>'+n+'</h2><section><img src="'+n+'-before.png"><img src="'+n+'-after.png"></section>').join(''));
 console.log(JSON.stringify({output,checks:after.checks.length,directLayouts:after.direct.length,identical:same.length,changed:changed.length,diagnosticSame,diagnosticChanged,adaptiveDifferences:adaptiveDifferences.map(r=>({name:r.name,size:r.size})),newOverflow:overflowChanges.filter(r=>r.before.vertical===0&&r.after.vertical>0).map(r=>r.name)},null,2));app.exit(0);
}catch(e){console.error(e.stack);console.error(output);app.exit(1);}});
