// Permanent comparison to committed rules milestone. No temporary baseline dependency.
const {app,BrowserWindow,session,nativeImage}=require('electron');
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict');
const {execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..'),baseline='35a9302',out=process.env.LEGEDIT_REVIEW_OUTPUT||path.join(__dirname,'review-artifacts/rare-hero-flavor-production');fs.mkdirSync(out,{recursive:true});
const fixtures=JSON.parse(fs.readFileSync(path.join(__dirname,'test-fixtures/rare-hero-flavor/fixtures.json')));
const scripts=['hero-template-config.js','assets.js','keywords.js','state.js','render.js','ui.js'];
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'hero-flavor-production-')));app.disableHardwareAcceleration();app.on('window-all-closed',()=>{});
async function run(current){
 const s=session.fromPartition('flavor-production-'+current+'-'+Date.now());s.webRequest.onBeforeRequest((d,cb)=>cb({cancel:/\.js(?:[?#]|$)/.test(d.url)||/^https?:/.test(d.url)}));
 const win=new BrowserWindow({show:false,webPreferences:{session:s,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
 await win.loadFile(path.join(root,'index.html'));
 const code=scripts.map(f=>current?fs.readFileSync(path.join(root,f),'utf8'):execFileSync('git',['show',baseline+':'+f],{cwd:root,encoding:'utf8'})).join('\n;\n');
 const probe=fs.readFileSync(path.join(__dirname,'hero-flavor-browser-probes.js'),'utf8');
 const corpus=['phase1-browser-probes.js','phase2-browser-probes.js','phase25-browser-probes.js','phase26-browser-probes.js'].map(f=>{
  const t=fs.readFileSync(path.join(__dirname,f),'utf8');return /phase2[56]-browser/.test(f)?t:t.replace(/images\[([^\n]+?)\]\s*=\s*canvas.toDataURL\(\);/g,'$&\n globalThis.phase25Record($1);');
 }).join('\n');
 // Historical geometry/flavor oracle uses its original icon basis; actual 1.60
 // shared-path coverage lives in inline-stat-production.cjs.
 const iconBasis='TEXTBOX_ICONS.abilityStatScale = 1.72;';
 const r=await win.webContents.executeJavaScript('(async()=>{'+code+'\n'+iconBasis+'\n'+corpus+'\n'+probe+'\nconst full=await phase26BrowserProbes("current",false);const focused=await heroFlavorChecks('+JSON.stringify(fixtures)+','+current+');return {full,focused};})()',true);
 win.destroy();return r;
}
const equal=(a,b)=>nativeImage.createFromDataURL(a).toBitmap().equals(nativeImage.createFromDataURL(b).toBitmap());
app.whenReady().then(async()=>{try{
 const before=await run(false),after=await run(true);const same=[],changed=[],rulesSame=[],corpusSame=[],corpusChanged=[];
 for(const [key,img]of Object.entries(before.full.images)){
  if(equal(img,after.full.images[key]))corpusSame.push(key);else{
   assert(/^(phase1__hero-rare-|phase2__hero-rare__|new__hero-rare__)/.test(key),'Out of scope '+key);corpusChanged.push(key);
  }
 }
 assert.deepEqual(before.full.diagnostics,after.full.diagnostics,'Corpus rules diagnostics changed');
 for(const [key,img]of Object.entries(before.focused.images)){
  assert.deepEqual(before.focused.results[key].rules,after.focused.results[key].rules,'Rules changed '+key);
  if(equal(img,after.focused.images[key]))same.push(key);else changed.push(key);
  const old=before.focused.results[key],now=after.focused.results[key];
  if(!old.flavor)assert(equal(img,after.focused.images[key]),'No-flavor changed '+key);
  else {
   assert.equal(old.flavor.fontSize,now.flavor.fontSize,'Flavor font changed '+key);
   if(now.fitting){
    assert.equal(old.flavorY,now.fitting.flavorY,'Legacy fitting origin changed '+key);
    assert.equal(old.overflow,now.fitting.overflow,'Legacy fitting overflow changed '+key);
   }
  }
  if(key.endsWith('__8__false'))for(const [label,src]of [['before',img],['after',after.focused.images[key]]])fs.writeFileSync(path.join(out,key+'-'+label+'.png'),nativeImage.createFromDataURL(src).toPNG());
 }
 for(const [key,img]of Object.entries(before.focused.rulesImages)){assert(equal(img,after.focused.rulesImages[key]),'Rules pixels changed '+key);rulesSame.push(key);}
 const paired=Object.keys(before.focused.results).filter(k=>!k.startsWith('color__')).map(k=>({key:k,before:before.focused.results[k],after:after.focused.results[k]}));
 const summary={baseline,iconBasis:1.72,checks:after.focused.checks.length,corpusChecks:after.full.checks.length,same,changed,rulesSame,corpusSame,corpusChanged,
  newlyOverflowing:paired.filter(r=>r.before.flavor?.overflow.vertical===0&&r.after.flavor?.overflow.vertical>0).map(r=>r.key),
  newlyClipped:paired.filter(r=>r.before.clipped===0&&r.after.clipped>0).map(r=>r.key),
  recoveredClipping:paired.filter(r=>r.before.clipped>0&&r.after.clipped===0).map(r=>r.key)};
 fs.writeFileSync(path.join(out,'measurements.json'),JSON.stringify({summary,paired,direct:after.focused.direct,checks:after.focused.checks},null,2));
 console.log(JSON.stringify(summary,null,2));app.exit(0);
}catch(e){console.error(e.stack);app.exit(1);}});
