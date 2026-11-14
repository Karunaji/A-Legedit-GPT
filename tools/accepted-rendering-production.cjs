// Current accepted milestone: real production sources, immutable image oracles.
const {app,BrowserWindow,session,nativeImage}=require('electron');
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),out=process.env.LEGEDIT_REVIEW_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'accepted-rendering-'));fs.mkdirSync(out,{recursive:true});
const files=['hero-template-config.js','assets.js','keywords.js','state.js','render.js','ui.js'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')]));const before=hashes();
const read=f=>fs.readFileSync(path.join(root,'tools',f),'utf8');
const corpus=['phase1-browser-probes.js','phase2-browser-probes.js','phase25-browser-probes.js','phase26-browser-probes.js'].map(f=>{const t=read(f);return /phase2[56]-browser/.test(f)?t:t.replace(/images\[([^\n]+?)\]\s*=\s*canvas.toDataURL\(\);/g,'$&\n globalThis.phase25Record($1);');}).join('\n');
const fixtures=JSON.parse(fs.readFileSync(path.join(root,'tools/test-fixtures/common-uncommon/fixtures.json')));
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'generalization-')));app.disableHardwareAcceleration();app.on('window-all-closed',()=>{});
app.whenReady().then(async()=>{try{
 const results={};
 for(const mode of ['control']){
  const s=session.fromPartition(mode);s.webRequest.onBeforeRequest((d,cb)=>cb({cancel:/\.js(?:[?#]|$)/.test(d.url)||/^https?:/.test(d.url)}));
  const w=new BrowserWindow({show:false,webPreferences:{session:s}});await w.loadFile(path.join(root,'index.html'));
  let code=files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n;\n');
  const result=await w.webContents.executeJavaScript('(async()=>{'+code+'\n'+corpus+'\n'+read('common-uncommon-browser-probes.js')+'\n'+read('soft-wrap-alignment-browser-probes.js')+'\nreturn {alignment:await softWrapAlignmentChecks(),full:await phase26BrowserProbes("current",false),heroes:await commonUncommonStudy('+JSON.stringify(fixtures)+')};})()',true);
  w.destroy();const imageHashes={};
  for(const [k,img]of Object.entries(result.full.images)){imageHashes[k]=crypto.createHash('sha256').update(nativeImage.createFromDataURL(img).toBitmap()).digest('hex');if(k.startsWith('spacing__'))fs.writeFileSync(path.join(out,mode+'-'+k+'.png'),nativeImage.createFromDataURL(img).toPNG());}
  delete result.full.images;result.imageHashes=imageHashes; const expected=JSON.parse(fs.readFileSync(path.join(__dirname,'test-fixtures/accepted-rendering/expected.json'))); if(JSON.stringify(imageHashes)!==JSON.stringify(expected.imageHashes))throw Error('Production differs from accepted icon candidate');
  for(const r of result.heroes){r.imageHash=crypto.createHash('sha256').update(nativeImage.createFromDataURL(r.image).toBitmap()).digest('hex');delete r.image;}
  if(result.heroes.length!==expected.heroes.length||result.heroes.some((r,i)=>r.id!==expected.heroes[i].id||r.imageHash!==expected.heroes[i].imageHash))throw Error('Hero result differs from accepted candidate'); console.log('MATCH: all 464 corpus images and 78 Hero images equal tested icons-only candidate'); results[mode]=result;fs.writeFileSync(path.join(out,mode+'.json'),JSON.stringify(result,null,2));console.log(result.alignment.length,'alignment checks'); console.log(mode,result.full.checks.length,'checks',Object.keys(imageHashes).length,'images',result.heroes.length,'Hero fixtures');
 }
 if(JSON.stringify(before)!==JSON.stringify(hashes()))throw Error('Production changed');
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({productionUnchanged:true,hashes:before},null,2));app.exit(0);
}catch(e){console.error(e.stack);app.exit(1);}});
