// Historical Scheme A geometry retained for this milestone oracle; current production is covered by scheme-a-production.cjs.
// Compare current production against the preserved uncommitted Phase 2.6 state.
const {app,BrowserWindow,session,nativeImage}=require('electron');
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),baseline=path.join(root,'tools/test-fixtures/hero-production-baseline');
const output=fs.mkdtempSync(path.join(os.tmpdir(),'legedit-hero-production-regression-'));
const scripts=['hero-template-config.js','assets.js','keywords.js','state.js','render.js','ui.js'];
const manifest=JSON.parse(fs.readFileSync(path.join(baseline,'hashes.json'),'utf8').replace(/^\uFEFF/,''));
for(const f of scripts){const expected=manifest.find(r=>r.Path.endsWith('\\'+f));assert(expected);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(baseline,f))).digest('hex').toUpperCase(),expected.Hash);}
app.setPath('userData',path.join(output,'profile'));app.disableHardwareAcceleration();app.on('window-all-closed',()=>{});
const probe=['phase1-browser-probes.js','phase2-browser-probes.js','phase25-browser-probes.js','phase26-browser-probes.js'].map(file=>{
 const s=fs.readFileSync(path.join(__dirname,file),'utf8');return /phase2[56]-browser/.test(file)?s:s.replace(/images\[([^\n]+?)\]\s*=\s*canvas.toDataURL\(\);/g,'$&\n globalThis.phase25Record($1);');
}).join('\n');
async function run(before){
 const s=session.fromPartition('hero-regression-'+before+'-'+Date.now());s.webRequest.onBeforeRequest((d,cb)=>cb({cancel:/\.js(?:[?#]|$)/.test(d.url)||/^https?:/.test(d.url)}));
 const win=new BrowserWindow({show:false,webPreferences:{session:s,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
 const errors=[];win.webContents.on('console-message',(_e,level,msg)=>{if(level===3&&!msg.includes('ERR_BLOCKED_BY_CLIENT'))errors.push(msg);});
 await win.loadFile(path.join(root,'index.html'));
 const code=scripts.map(f=>fs.readFileSync(path.join(before?baseline:root,f),'utf8')).join('\n;\n');
 // Historical geometry/flavor oracle uses its original icon basis; actual 1.60
 // shared-path coverage lives in inline-stat-production.cjs.
 const iconBasis='TEXTBOX_ICONS.abilityStatScale = 1.72;' + require('./historical-rare-multicolor-basis.cjs') + require('./historical-scheme-a-basis.cjs');
 console.log('Historical oracle: 1.72 icons and legacy rare-multicolor routing; legacy Scheme A geometry; actual routes covered by rare-multicolor-production.cjs and scheme-a-production.cjs.');
 const result=await win.webContents.executeJavaScript('(async()=>{'+code+'\n'+iconBasis+'\n'+probe+'\nreturn await phase26BrowserProbes("current",false);})()',true);
 win.destroy();assert.deepEqual(errors,[]);return result;
}
app.whenReady().then(async()=>{try{
 const before=await run(true),after=await run(false),same=[],changed=[];
 for(const [name,src] of Object.entries(before.images)){
  const a=nativeImage.createFromDataURL(src),b=nativeImage.createFromDataURL(after.images[name]);
  if(a.toBitmap().equals(b.toBitmap()))same.push(name);else{
   assert(/^(phase1__hero-rare-|phase2__hero-rare__|new__hero-rare__)/.test(name),'Out-of-scope pixels changed: '+name);
   changed.push(name);for(const [label,img]of [['before',a],['after',b]])fs.writeFileSync(path.join(output,name+'-'+label+'.png'),img.toPNG());
  }
 }
 const overflowChanges=[];
 for(const [name,layouts]of Object.entries(after.diagnostics))layouts.forEach((l,i)=>{
  const prev=before.diagnostics[name]?.[i];if(!prev)return;
  if(l.overflow.vertical!==prev.overflow.vertical||l.overflow.horizontal!==prev.overflow.horizontal)
   overflowChanges.push({name,half:i,before:prev.overflow,after:l.overflow,newlyOverflowing:prev.overflow.vertical===0&&l.overflow.vertical>0});
 });
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({baseline,checks:after.checks,same,changed,overflowChanges,beforeDiagnostics:before.diagnostics,diagnostics:after.diagnostics},null,2));
 fs.writeFileSync(path.join(output,'review.html'),'<!doctype html><meta charset="utf-8"><style>body{font:16px system-ui}section{display:flex;gap:20px}img{max-width:48%;object-fit:contain}</style><h1>Preserved Phase 2.6 / current production</h1>'+changed.map(n=>'<h2>'+n+'</h2><section><img src="'+n+'-before.png"><img src="'+n+'-after.png"></section>').join(''));
 console.log(JSON.stringify({output,iconBasis:1.72,checks:after.checks.length,identical:same.length,changed:changed.length,overflowChanges,newlyOverflowing:overflowChanges.filter(r=>r.newlyOverflowing).length},null,2));app.exit(0);
}catch(e){console.error(e.stack);console.error(output);app.exit(1);}});
