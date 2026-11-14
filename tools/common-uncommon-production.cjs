// Default validates the latest accepted milestone. --historical validates the original calibration in isolation.
if (!process.argv.includes('--historical')) { require('./accepted-rendering-production.cjs'); } else {
// npm install, then: node_modules/.bin/electron.cmd tools/common-uncommon-production.cjs
// Requires the preserved d60d70a checkpoint. No saved projects or user storage touched.
const {app,BrowserWindow,session,nativeImage}=require('electron');
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const assert=require('assert/strict'),{execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..');
const fixtureDir=path.join(__dirname,'test-fixtures/common-uncommon');
const out=process.env.LEGEDIT_REVIEW_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'common-uncommon-check-'));
fs.mkdirSync(out,{recursive:true});
const fixtures=JSON.parse(fs.readFileSync(path.join(fixtureDir,'fixtures.json')));
const expected=JSON.parse(fs.readFileSync(path.join(fixtureDir,'candidate.json')));
const files=['hero-template-config.js','assets.js','keywords.js','state.js','render.js','ui.js'];
const read=n=>fs.readFileSync(path.join(__dirname,n),'utf8');
const codeProbe=read('common-uncommon-browser-probes.js');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'common-uncommon-profile-')));
app.disableHardwareAcceleration();app.on('window-all-closed',()=>{});
async function run(before,expression,probes) {
  const isolated=session.fromPartition('common-uncommon-'+before+'-'+Date.now());
  isolated.webRequest.onBeforeRequest((d,cb)=>cb({cancel:/\.js(?:[?#]|$)/.test(d.url)||/^https?:/.test(d.url)}));
  const w=new BrowserWindow({show:false,webPreferences:{session:isolated,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  await w.loadFile(path.join(root,'index.html'));
  const code=files.map(f=>before?execFileSync('git',['show','d60d70a:'+f],{cwd:root,encoding:'utf8'}):(f==='render.js'?fs.readFileSync(path.join(__dirname,'test-fixtures/soft-wrap-alignment/render-before.js'),'utf8'):execFileSync('git',['show','d60d70a:'+f],{cwd:root,encoding:'utf8'}))).join('\n;\n');
  const result=await w.webContents.executeJavaScript('(async()=>{'+code+'\n'+probes+'\nreturn '+expression+';})()',true);
  w.destroy();return result;
}
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
app.whenReady().then(async()=>{try{
  const current=await run(false,'await commonUncommonStudy('+JSON.stringify(fixtures)+')',codeProbe);
  const snapshotFields=['rules','flavor','flavorY','flavorPlacement','paintedGap','flavorClipped','contourSlack'];
  for(const r of current) {
    const f=fixtures.find(f=>f.id===r.id);
    assert.equal(r.rules.overflow.missingIcons.length,0,r.id+' missing icons');
    assert(r.contourSlack>=-0.001,r.id+' badge envelope');
    if(r.minimumIconGap!==null)assert(r.minimumIconGap>=r.requiredGap-0.001,r.id+' icon clearance');
    if(r.flavor)assert(r.paintedGap>=6-0.001,r.id+' flavor gap');
    assert(r.rules.font>=Math.min(f.font??22,Math.max(16,(f.font??22)-3)),r.id+' font floor');
    if(expected[r.id]) {
      for(const k of snapshotFields)assert.deepEqual(JSON.parse(JSON.stringify(r[k])),expected[r.id][k],r.id+' candidate '+k);
      assert.equal(digest(nativeImage.createFromDataURL(r.image).toPNG()),expected[r.id].pngHash,r.id+' candidate pixels');
    }
    fs.writeFileSync(path.join(out,r.id+'-after.png'),nativeImage.createFromDataURL(r.image).toPNG());
    delete r.image;
  }
  // Exact same fonts/assets/browser on both sides; only Common/Uncommon single
  // routes may differ. Includes all17 card families at1x and3x export scale.
  const familyProbe=read('phase1-browser-probes.js');
  const before=await run(true,'await phase1BrowserProbes("baseline",false)',familyProbe);
  const after=await run(false,'await phase1BrowserProbes("current",false)',familyProbe);
  let identical=0,changed=0;
  for(const [name,src] of Object.entries(before.images)) {
    const a=nativeImage.createFromDataURL(src),b=nativeImage.createFromDataURL(after.images[name]);
    const equal=a.toBitmap().equals(b.toBitmap());
    if(!/^hero-(common|uncommon)-/.test(name)){assert(equal,'Excluded route changed '+name);identical++;}
    else {if(!equal)changed++;const size=a.getSize();const rect={x:0,y:0,width:size.width,height:Math.floor(size.height*.7)};assert(a.crop(rect).toBitmap().equals(b.crop(rect).toBitmap()),'Upper card changed '+name);}
  }
  const icon=await run(false,'await phase26BrowserProbes("current",true)',read('phase26-browser-probes.js'));
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({current,excludedImagesIdentical:identical,affectedImagesChanged:changed,familyChecks:after.checks,iconChecks:icon.checks},null,2));
  console.log(JSON.stringify({out,fixtures:current.length,candidateSnapshots:Object.keys(expected).length,excludedImagesIdentical:identical,affectedImagesChanged:changed,familyChecks:after.checks.length,iconChecks:icon.checks.length},null,2));app.exit(0);
}catch(e){console.error(e.stack);app.exit(1);}});

}
