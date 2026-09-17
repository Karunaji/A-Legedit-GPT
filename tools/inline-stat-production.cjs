// Permanent actual-production vs accepted in-memory diagnostic comparison.
const {app,BrowserWindow,session,nativeImage}=require('electron');
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict');
const {execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..'),out=process.env.LEGEDIT_REVIEW_OUTPUT||path.join(__dirname,'review-artifacts/inline-stat-icon-production');fs.mkdirSync(out,{recursive:true});
const scripts=['hero-template-config.js','assets.js','keywords.js','state.js','render.js','ui.js'];
const fixtures=JSON.parse(fs.readFileSync(path.join(__dirname,'test-fixtures/inline-stat-icons/fixtures.json')));
const flavorFixtures=JSON.parse(fs.readFileSync(path.join(__dirname,'test-fixtures/rare-hero-flavor/fixtures.json')));
const heroFixtures=JSON.parse(fs.readFileSync(path.join(__dirname,'test-fixtures/hero-calibration-330-27/measurements.json'))).results.filter(r=>r.width===330&&r.advance===27&&r.model==='contour');
const historicalRouting=require('./historical-rare-multicolor-basis.cjs');
console.log('Icon milestone oracle retains legacy rare-multicolor routing; actual route covered by rare-multicolor-production.cjs.');
const diagOverride=`const diagnosticPlacement=getInlineIconPlacement;getInlineIconPlacement=function(key,size,reference=null){const saved=TEXTBOX_ICONS.statScale;if(reference&&['attack','recruit','a','r'].includes(key))TEXTBOX_ICONS.statScale=1.60;try{return diagnosticPlacement(key,size,reference);}finally{TEXTBOX_ICONS.statScale=saved;}};`;
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'inline-stat-production-')));app.disableHardwareAcceleration();app.on('window-all-closed',()=>{});
const corpus=['phase1-browser-probes.js','phase2-browser-probes.js','phase25-browser-probes.js','phase26-browser-probes.js'].map(f=>{const t=fs.readFileSync(path.join(__dirname,f),'utf8');return /phase2[56]-browser/.test(f)?t:t.replace(/images\[([^\n]+?)\]\s*=\s*canvas.toDataURL\(\);/g,'$&\n globalThis.phase25Record($1);');}).join('\n');
const probes=['inline-stat-browser-probes.js','hero-flavor-browser-probes.js','hero-production-browser-probes.js'].map(f=>fs.readFileSync(path.join(__dirname,f),'utf8')).join('\n');
const oldRender=fs.readFileSync(path.join(__dirname,'test-fixtures/hero-production-baseline/render.js'),'utf8');
const reference=oldRender.slice(oldRender.indexOf('function drawAdaptiveTextBlock('),oldRender.indexOf('function drawText(')).replace('function drawAdaptiveTextBlock(','function referenceAdaptiveTextBlock(');
async function run(mode){
 const s=session.fromPartition('stat-production-'+mode);s.webRequest.onBeforeRequest((d,cb)=>cb({cancel:/\.js(?:[?#]|$)/.test(d.url)||/^https?:/.test(d.url)}));
 const w=new BrowserWindow({show:false,webPreferences:{session:s,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});await w.loadFile(path.join(root,'index.html'));
 const source=scripts.map(f=>mode==='after'?fs.readFileSync(path.join(root,f),'utf8'):execFileSync('git',['show','a8232b2:'+f],{cwd:root,encoding:'utf8'})).join('\n;\n');
 const result=await w.webContents.executeJavaScript('(async()=>{'+source+'\n'+(mode==='diagnostic'?diagOverride:'')+'\n'+historicalRouting+'\n'+corpus+'\n'+probes+'\n'+reference+`
 const full=await phase26BrowserProbes('current',false);
 const focused=await inlineStatProductionFixtures(${JSON.stringify(fixtures)});
 let flavor=null,hero=null,scope=[];
 if(${JSON.stringify(mode)}==='after'){
  const ctx=document.createElement('canvas').getContext('2d');ctx.textBaseline='top';
  for(const size of [22,21,18]){
   const cap={top:-1,bottom:16};
   for(const key of ['attack','recruit','a','r']){
    const p=getInlineIconPlacement(key,size,cap),old=getInlineIconPlacement(key,size);
    if(p.height!==Math.round(size*1.60)||old.height!==Math.round(size*1.72))throw Error('Scope/size '+key);
    if(Math.abs(p.offsetY+p.height/2-7.5)>.001)throw Error('Centering '+key);
    scope.push({size,key,height:p.height,oldBasisHeight:old.height});
   }
   for(const key of ['strength','range','tech','covert','instinct'])if(getInlineIconPlacement(key,size,cap).height!==getInlineIconPlacement(key,size).height)throw Error('Class size changed');
  }
  flavor=await heroFlavorChecks(${JSON.stringify(flavorFixtures)},true);hero=await heroProductionChecks(${JSON.stringify(heroFixtures)},true);
 }
 return {full,focused,flavor,hero,scope};})()`,true);w.destroy();return result;
}
const eq=(a,b)=>nativeImage.createFromDataURL(a).toBitmap().equals(nativeImage.createFromDataURL(b).toBitmap());
app.whenReady().then(async()=>{try{
 const before=await run('before'),diagnostic=await run('diagnostic'),after=await run('after');
 const corpusSame=[],corpusChanged=[];
 for(const [k,img]of Object.entries(after.full.images)){
  assert(eq(img,diagnostic.full.images[k]),'Production differs from accepted scale-only path: '+k);
  (eq(img,before.full.images[k])?corpusSame:corpusChanged).push(k);
 }
 assert.deepEqual(after.full.diagnostics,diagnostic.full.diagnostics,'Cross-family positioned layout differs from diagnostic');
 assert.deepEqual(after.full.metrics,diagnostic.full.metrics,'Direct layout differs from diagnostic');
 const paired=after.focused.map((r,i)=>{
  const b=before.focused[i],d=diagnostic.focused[i];assert(eq(r.image,d.image),'Focused pixels '+r.fixture.id);
  const withoutImage=({image,...rest})=>rest;assert.deepEqual(withoutImage(r),withoutImage(d),'Focused metrics '+r.fixture.id);
  for(const [label,v]of [['before',b],['after',r]])fs.writeFileSync(path.join(out,r.fixture.id+'-'+label+'.png'),nativeImage.createFromDataURL(v.image).toPNG());
  return {id:r.fixture.id,before:withoutImage(b),after:withoutImage(r),imageChanged:!eq(b.image,r.image)};
 });
 const byId=id=>paired.find(r=>r.id===id);
 assert.equal(byId('centering').after.fontSize,19);assert.equal(byId('centering').after.lines.length,1);assert(byId('centering').after.blocks[0].protected);
 assert(Math.abs(byId('dense').before.overflow.vertical-2.72)<.001);assert.equal(byId('dense').after.overflow.vertical,0);
 for(const r of paired){assert(r.after.flavor.placement.paintedBottomBeyondClip<=r.before.flavor.placement.paintedBottomBeyondClip+.001,'New clipping '+r.id);assert(r.after.overflow.vertical<=r.before.overflow.vertical+.001,'Worse overflow '+r.id);}
 const familyChanges={};for(const k of corpusChanged){const family=k.startsWith('spacing__')?k.split('__')[1]:null;if(family)familyChanges[family]=(familyChanges[family]||0)+1;}
 const summary={baseline:'a8232b2',scale:1.60,checks:after.full.checks.length,flavorChecks:after.flavor.checks.length,heroChecks:after.hero.checks.length,heroDirect:after.hero.direct.length,corpusCompared:corpusSame.length+corpusChanged.length,corpusSame:corpusSame.length,corpusChanged:corpusChanged.length,diagnosticPixelMatches:Object.keys(after.full.images).length+paired.length,focusedCompared:paired.length,focusedChanged:paired.filter(r=>r.imageChanged).length,familyChanges};
 fs.writeFileSync(path.join(out,'measurements.json'),JSON.stringify({summary,paired,scope:after.scope,corpusSame,corpusChanged,beforeDiagnostics:before.full.diagnostics,afterDiagnostics:after.full.diagnostics},null,2));
 console.log(JSON.stringify(summary,null,2));app.exit(0);
}catch(e){console.error(e.stack);app.exit(1);}});
