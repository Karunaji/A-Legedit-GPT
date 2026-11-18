// Run with Electron. Real FileReader/Image/DOM smoke test; no user storage touched.
const {app,BrowserWindow,session}=require('electron');
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'team-upload-')));
app.disableHardwareAcceleration();app.on('window-all-closed',()=>{});
app.whenReady().then(async()=>{try {
 const s=session.fromPartition('upload');s.webRequest.onBeforeRequest((d,cb)=>cb({cancel:/\.js(?:[?#]|$)/.test(d.url)||/^https?:/.test(d.url)}));
 const w=new BrowserWindow({show:false,webPreferences:{session:s}});await w.loadFile(path.join(root,'index.html'));
 const code=['hero-template-config.js','assets.js','keywords.js','state.js','render.js','ui.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n;\n');
 const result=await w.webContents.executeJavaScript('(async()=>{'+code+String.raw`
   await Promise.all(Object.keys(A).map(loadI)); await preloadCanvasFonts(); await document.fonts.ready;
   const canvas=document.createElement('canvas');canvas.width=16;canvas.height=16;
   canvas.getContext('2d').fillRect(4,4,8,8);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve));
   const input=document.getElementById('team-icon-file');
   // The isolated harness evaluates scripts inside this function, not global scope.
   input.onchange=loadTeamIcon;
   document.getElementById('team-add-btn').onclick=addCustomTeam;
   const data=new DataTransfer();data.items.add(new File([blob],'test-icon.png',{type:'image/png'}));
   input.files=data.files;input.dispatchEvent(new Event('change',{bubbles:true}));
   const deadline=Date.now()+5000;
   while(!st.pendingTeamImg && Date.now()<deadline) await new Promise(resolve=>setTimeout(resolve,20));
   if(!st.pendingTeamImg) throw Error(document.getElementById('team-icon-status').textContent);
   const ready=document.getElementById('team-icon-status').textContent;
   document.getElementById('team-add-btn').click();
   const saved=serializeCustomTeams();const loaded=deserializeCustomTeams(saved);
   await loaded[0].img.decode();
   return {ready,count:st.customTeams.length,selected:document.getElementById('s-team').value,
     retryCleared:input.value==='',buttonDisabled:document.getElementById('team-add-btn').disabled,
     embedded:saved[0].src.startsWith('data:image/png'),roundTrip:loaded[0].img.naturalWidth===16};
 })()`,true);
 assert(result.ready.includes('Add to List'));assert.equal(result.count,1);assert.equal(result.selected,'custom_0');
 for(const key of ['retryCleared','buttonDisabled','embedded','roundTrip'])assert(result[key],key);
 console.log('Real browser upload/add/save-load smoke test passed',result);w.destroy();app.exit(0);
}catch(e){console.error(e.stack);app.exit(1);}});
